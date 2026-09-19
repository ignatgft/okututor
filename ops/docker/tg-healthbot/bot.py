import os, asyncio, time, httpx
from telegram import Bot
from telegram.constants import ParseMode

TOKEN = os.getenv("TG_BOT_TOKEN","")
ADMIN_IDS = [x.strip() for x in (os.getenv("TG_ADMIN_CHAT_IDS") or os.getenv("TG_ADMIN_CHAT_ID","")).split(",") if x.strip()]
BACKEND = os.getenv("BACKEND_URL","http://backend:8080")
FRONTEND = os.getenv("FRONTEND_URL","http://frontend:80")
INTERVAL = int(os.getenv("CHECK_INTERVAL","60"))
GRAFANA = os.getenv("GRAFANA_URL","http://grafana:3000")

bot = Bot(token=TOKEN) if TOKEN else None
last_state = {}
suppress = {} # alertname -> last_sent_ts

def severity_of(problem:str)->str:
    if any(x in problem.lower() for x in ["down","critical","disk >90","5xx >10","недоступен"]): return "CRITICAL"
    if any(x in problem.lower() for x in ["disk 80","p95","5xx","latency","задержка"]): return "WARNING"
    return "INFO"

def severity_label(sev:str)->str:
    if sev == "CRITICAL": return "🔴 КРИТИЧНО"
    if sev == "WARNING": return "🟡 ВНИМАНИЕ"
    if sev == "INFO": return "ℹ️ ИНФО"
    return sev

async def check_once():
    checks = []
    # 1. Backend liveness
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{BACKEND}/actuator/health/ready")
            ok = r.status_code==200 and "UP" in r.text
            checks.append(("backend", ok, f"HTTP {r.status_code}"))
    except Exception as e:
        checks.append(("backend", False, str(e)))
    # 2. Frontend
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(FRONTEND, follow_redirects=True)
            checks.append(("frontend", r.status_code==200, f"HTTP {r.status_code}"))
    except Exception as e:
        checks.append(("frontend", False, str(e)))
    return checks

async def send(msg:str, severity="CRITICAL"):
    if not bot or not ADMIN_IDS:
        print(f"[{severity}] {msg}")
        return
    for cid in ADMIN_IDS:
        try:
            await bot.send_message(chat_id=int(cid) if cid.lstrip('-').isdigit() else cid, text=msg, parse_mode=ParseMode.HTML, disable_web_page_preview=True)
        except Exception as e:
            print("ошибка отправки в Telegram", e)

async def handle_alert(update, context):
    # Alertmanager webhook → /alert POST (реализовано через backend /api/v1/telegram/alert)
    pass

# Человекочитаемые названия сервисов на русском
SERVICE_NAMES = {
    "backend": "Бэкенд (API)",
    "frontend": "Фронтенд",
}

async def loop():
    while True:
        for name, ok, detail in await check_once():
            key = f"{name}_down"
            is_down = not ok
            was_down = last_state.get(name, False)
            last_state[name]=is_down
            if is_down and not was_down:
                # cooldown 15м на алерт
                last = suppress.get(key,0)
                if time.time() - last < 900:
                    continue
                suppress[key]= time.time()
                severity = "CRITICAL" if name=="backend" else "WARNING"
                label = severity_label(severity)
                svc = SERVICE_NAMES.get(name, name)
                msg = (
                    f"<b>{label} — OkuTutor Production</b>\n"
                    f"Сервис: {svc}\n"
                    f"Проблема: сервис недоступен\n"
                    f"Детали: {detail}\n"
                    f"Время: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
                    f"Grafana: {GRAFANA}\n"
                    f"Действие: проверьте логи и состояние сервиса"
                )
                await send(msg, severity)
            elif not is_down and was_down:
                svc = SERVICE_NAMES.get(name, name)
                await send(
                    f"<b>✅ ВОССТАНОВЛЕНО — OkuTutor</b>\n"
                    f"Сервис: {svc} восстановлен\n"
                    f"Детали: {detail}\n"
                    f"Время: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}",
                    "INFO"
                )
        await asyncio.sleep(INTERVAL)

if __name__=="__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    if not TOKEN: print("TG_BOT_TOKEN не задан — работа в режиме только логов")
    # команды бота
    async def cmd_status(update, ctx):
        txt = "<b>📊 СТАТУС СИСТЕМЫ — OkuTutor</b>\n\n"
        if not last_state:
            txt += "Пока нет данных — проверка ещё не выполнялась.\n"
        else:
            for k,v in last_state.items():
                svc = SERVICE_NAMES.get(k, k)
                txt+= f"{svc}: {'🔴 недоступен' if v else '🟢 работает'}\n"
        txt+= f"\nBackend: {BACKEND}\nFrontend: {FRONTEND}\nGrafana: {GRAFANA}\n"
        txt+= f"\nИнтервал проверки: {INTERVAL} сек"
        await update.message.reply_text(txt, parse_mode=ParseMode.HTML)

    async def cmd_help(update, ctx):
        txt = (
            "<b>🤖 OkuTutor Health Bot — помощь</b>\n\n"
            "/status — статус всех сервисов\n"
            "/health — то же, что /status\n"
            "/help — эта справка\n\n"
            "Бот автоматически оповещает о проблемах:\n"
            "🔴 Критично — бэкенд недоступен\n"
            "🟡 Внимание — фронтенд недоступен\n"
            "✅ Восстановлено — сервис снова работает"
        )
        await update.message.reply_text(txt, parse_mode=ParseMode.HTML)

    if bot:
        from telegram.ext import Application, CommandHandler
        app = Application.builder().token(TOKEN).build()
        app.add_handler(CommandHandler("status", cmd_status))
        app.add_handler(CommandHandler("health", cmd_status))
        app.add_handler(CommandHandler("help", cmd_help))
        app.add_handler(CommandHandler("start", cmd_help))
        # run bot + loop concurrently
        async def run():
            await app.initialize()
            await app.start()
            await app.updater.start_polling()
            await loop()
        asyncio.run(run())
    else:
        asyncio.run(loop())
