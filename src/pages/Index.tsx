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
        <title>আলুসাথী — আলু চাষ, বিক্রি ও কেনার সহায়তা</title>
        <meta name="description" content="আলুর চাষ, জমির খাতা, বিক্রির লট, ক্রেতার দর এবং কেনাকাটার খরচ—আলুসাথীতে এক জায়গায়।" />
        <meta name="theme-color" content="#112a20" />
      </Helmet>
      {farmerHome ? <AluSathiDashboard key={`${user?.id || 'guest'}-${farmerHome}`} farmerHome /> : <PublicLanding />}
    </>
  );
}
