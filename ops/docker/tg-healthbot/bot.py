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
    if any(x in problem.lower() for x in ["down","critical","disk >90","5xx >10"]): return "CRITICAL"
    if any(x in problem.lower() for x in ["disk 80","p95","5xx","latency"]): return "WARNING"
    return "INFO"

async def check_once():
    now = time.time()
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
    # 3. DB via backend health details? fallback to backend check already includes
    return checks

async def send(msg:str, severity="CRITICAL"):
    if not bot or not ADMIN_IDS: 
        print(f"[{severity}] {msg}")
        return
    for cid in ADMIN_IDS:
        try:
            await bot.send_message(chat_id=int(cid) if cid.lstrip('-').isdigit() else cid, text=msg, parse_mode=ParseMode.HTML, disable_web_page_preview=True)
        except Exception as e:
            print("tg send fail", e)

async def handle_alert(update, context):
    # Alertmanager webhook → /alert POST
    pass # implemented via aiohttp in main if needed

async def loop():
    while True:
        for name, ok, detail in await check_once():
            key = f"{name}_down"
            is_down = not ok
            was_down = last_state.get(name, False)
            last_state[name]=is_down
            if is_down and not was_down:
                # cooldown 15m per alert
                last = suppress.get(key,0)
                if now:=time.time() - last < 900:
                    continue
                suppress[key]= time.time()
                severity = "CRITICAL" if name=="backend" else "WARNING"
                msg = f"<b>{severity} — OkuTutor Production</b>\nService: {name}\nProblem: {name} down\nDetail: {detail}\nGrafana: {GRAFANA}"
                await send(msg, severity)
            elif not is_down and was_down:
                await send(f"<b>RESOLVED — OkuTutor</b>\nService: {name} recovered\nDetail: {detail}", "INFO")
        await asyncio.sleep(INTERVAL)

if __name__=="__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    if not TOKEN: print("TG_BOT_TOKEN not set — running in log-only mode")
    # commands
    async def cmd_status(update, ctx):
        txt = "<b>SYSTEM STATUS</b>\n"
        for k,v in last_state.items():
            txt+= f"{k}: {'🔴 down' if v else '🟢 healthy'}\n"
        txt+= f"\nBackend: {BACKEND}\nFrontend: {FRONTEND}\nGrafana: {GRAFANA}"
        await update.message.reply_text(txt, parse_mode=ParseMode.HTML)
    if bot:
        from telegram.ext import Application, CommandHandler
        app = Application.builder().token(TOKEN).build()
        app.add_handler(CommandHandler("status", cmd_status))
        app.add_handler(CommandHandler("health", cmd_status))
        # run bot + loop concurrently
        async def run():
            await app.initialize()
            await app.start()
            await app.updater.start_polling()
            await loop()
        asyncio.run(run())
    else:
        asyncio.run(loop())
