"use client";

import GuardSesion from "@/components/dashboard/GuardSesion";
import PanelVivo from "@/components/PanelVivo";

export default function DashboardPage() {
  return (
    <GuardSesion>
      <PanelVivo />
    </GuardSesion>
  );
}
