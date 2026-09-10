// migrated to TSX — minimal strict types (controlled)
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchComp/SearchBar";

function PgSearch() {
  const { t } = useTranslation();
  return (
    <>
      <Navbar />
      <main className="search-page-container">
        <section className="search-hero">
          <h1>{t("search.hero_title", "Studying Online is now much easier!")}</h1>
          <p>{t("search.hero_subtitle", "Find the perfect tutor for any subject")}</p>
        </section>
        <SearchBar />
      </main>
    </>
  );
}

export default PgSearch;
