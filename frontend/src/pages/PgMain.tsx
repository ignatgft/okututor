// Главная — для гостей лендинг, для залогиненных каталог [Image 1]
import { useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { scroller } from "react-scroll";
import useAuthStore from "../store/authStore";
import MarketplaceHero from "../components/HomeSection/MarketplaceHero";
import SubjectGrid from "../components/HomeSection/SubjectGrid";
import PopTutor from "../components/HomeSection/PopTutor";
import HowItWorks from "../components/HomeSection/HowItWorks";
import ForTutors from "../components/HomeSection/ForTutors";
import Footer from "../components/HomeSection/Footer";

function PgMain() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (location.state?.target) {
      scroller.scrollTo(location.state.target, { smooth: true, duration: 500 });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // Незарегистрированным — лендинг (PublicLayout уже даёт шапку, поэтому Navbar не дублируем)
  if (!isAuthenticated) {
    return (
      <main id="main-content">
        <section id="hero"><MarketplaceHero /></section>
        <section id="subjects"><SubjectGrid /></section>
        <section id="find-tutor"><PopTutor /></section>
        <HowItWorks />
        <section id="for-tutors"><ForTutors /></section>
        <section id="about-us"><Footer /></section>
      </main>
    );
  }

  // Залогиненным — в приложение
  return <Navigate to="/app/dashboard" replace />;
}

export default PgMain;