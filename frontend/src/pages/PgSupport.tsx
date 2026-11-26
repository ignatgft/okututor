// migrated to TSX — minimal strict types (controlled)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useSupportTickets from "../hooks/support/useSupportTickets";
import SupportTicketCard from "../components/support/SupportTicketCard";
import SupportFilterBar from "../components/support/SupportFilterBar";
import { Spinner, EmptyState, ErrorState } from "../components/ui/Primitives";
import "../styles/Support.css";

export default function PgSupport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const { tickets, loading, error, refetch } = useSupportTickets(filter);

  return (
    <div className="support-page">
      <p className="support-page-sub">{t("support.my_tickets_hint", "Track and respond to your support requests")}</p>
      <div className="support-header-row">
        <SupportFilterBar filter={filter} onFilterChange={setFilter} />
        <button type="button" className="btn-primary" onClick={() => navigate("/app/support/new")}>
          {t("support.new_ticket", "New ticket")}
        </button>
      </div>

      {loading && <Spinner label={t("common.loading", "Loading...")} />}

      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && tickets.length === 0 && (
        <EmptyState
          title={t("support.no_tickets", "No tickets yet")}
          hint={t("support.no_tickets_hint", "Create a ticket if you need help")}
        />
      )}

      <div className="support-ticket-list" role="list" aria-label={t("support.my_tickets", "My Tickets")}>
        {tickets.map(ticket => (
          <div key={ticket.id} role="listitem">
            <SupportTicketCard ticket={ticket} basePath="/app/support/tickets" />
          </div>
        ))}
      </div>
    </div>
  );
}
