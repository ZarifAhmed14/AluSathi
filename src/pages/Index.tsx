import { Helmet } from "react-helmet";
import AluSathiDashboard from "@/components/AluSathiDashboard";
import PublicLanding from "@/components/PublicLanding";
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
        <meta name="description" content="Bangla-first field support and potato trade tools for farmers and businesses in Bangladesh." />
        <meta name="theme-color" content="#112a20" />
      </Helmet>
      {farmerHome ? <AluSathiDashboard key={`${user?.id || 'guest'}-${farmerHome}`} farmerHome /> : <PublicLanding />}
    </>
  );
}
