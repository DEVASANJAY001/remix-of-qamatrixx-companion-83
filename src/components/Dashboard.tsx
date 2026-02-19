import { getDashboardSummary } from "@/data/qaMatrixData";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { Shield, CheckCircle, Factory, Layers, Car, Wrench } from "lucide-react";

interface DashboardProps {
  data: QAMatrixEntry[];
  onFilterByCategory: (filterType: string, filterValue: string) => void;
}

const pct = (count: number, total: number) =>
  total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";

const Dashboard = ({ data, onFilterByCategory }: DashboardProps) => {
  const summary = getDashboardSummary(data);
  const total = summary.total;

  const stationCards = [
    { label: "Total Concerns", value: total, icon: Factory, color: "primary" },
    { label: "Workstation OK", value: summary.okWorkstation, icon: Wrench, color: "success" },
    { label: "MFG OK", value: summary.okMfg, icon: Shield, color: "success" },
    { label: "Plant OK", value: summary.okPlant, icon: CheckCircle, color: "success" },
  ];

  const areaGroups = [
    { key: "TRIM", label: "Trim", data: summary.trim },
    { key: "CHASSIS", label: "Chassis", data: summary.chassis },
    { key: "FINAL", label: "Final", data: summary.final },
  ];

  const sourceGroups = [
    { key: "DVX", label: "DVX", data: summary.dvx },
    { key: "ER3", label: "ER3", data: summary.er3 },
    { key: "ER4", label: "ER4", data: summary.er4 },
    { key: "FIELD", label: "Field", data: summary.field },
    { key: "SCA", label: "SCA", data: summary.sca },
  ];

  return (
    <div className="space-y-5">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stationCards.map((card) => (
          <div key={card.label} className="dashboard-card flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-${card.color}/15`}>
              <card.icon className={`w-5 h-5 text-${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{card.value}</p>
              <p className="text-xs text-muted-foreground">
                {card.label}
                {card.label !== "Total Concerns" && (
                  <span className="ml-1 text-muted-foreground/70">({pct(card.value, total)})</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Area sections: Trim, Chassis, Final */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {areaGroups.map((group) => (
          <button
            key={group.key}
            onClick={() => onFilterByCategory("designation", group.key)}
            className="dashboard-card text-left hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="section-header !mb-0">{group.label}</h3>
              <span className="text-lg font-bold font-mono">{group.data.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{pct(group.data.total, total)} of total</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Workstation", val: group.data.okWorkstation },
                { label: "MFG", val: group.data.okMfg },
                { label: "Plant", val: group.data.okPlant },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-success/10 border border-success/20 p-1.5">
                  <p className="text-xs font-semibold text-success">{s.val} OK</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Source sections: DVX, ER3, ER4, FIELD, SCA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {sourceGroups.map((group) => (
          <button
            key={group.key}
            onClick={() => onFilterByCategory("source", group.key)}
            className="dashboard-card text-left hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold">{group.label}</h3>
              <span className="text-lg font-bold font-mono">{group.data.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{pct(group.data.total, total)} of total</p>
            <div className="space-y-1">
              {[
                { label: "WS", val: group.data.okWorkstation },
                { label: "MFG", val: group.data.okMfg },
                { label: "Plant", val: group.data.okPlant },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="status-ok">{s.val} OK</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
