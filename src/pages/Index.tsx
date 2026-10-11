import { Helmet } from "react-helmet";
import AluSathiDashboard from "@/components/AluSathiDashboard";
import {useAuth} from "@/contexts/AuthContext";
import {useDemo} from "@/contexts/DemoContext";
import {Navigate} from "react-router-dom";

export default function Index({ farmerHome = false }: { farmerHome?: boolean }) {
  const {user}=useAuth();
  const {demo}=useDemo();
  if (farmerHome && !user && !demo) return <Navigate to="/auth" replace />;
  return (
    <>
      <Helmet>
        <title>আলুসাথী — আলুর রোগ বুঝুন, সহজে</title>
        <meta name="description" content="Bangla-first AI leaf screening, whole-field checks and weather-aware guidance for Bangladesh potato farmers." />
        <meta name="theme-color" content="#112a20" />
      </Helmet>
      <AluSathiDashboard key={`${user?.id || 'guest'}-${farmerHome}`} farmerHome={farmerHome} />
    </>
  );
}
