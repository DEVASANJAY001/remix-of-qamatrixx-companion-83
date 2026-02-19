import { Status } from "@/types/qaMatrix";

interface StatusBadgeProps {
  status: Status;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={status === "OK" ? "status-ok" : "status-ng"}>
      {status}
    </span>
  );
};

export default StatusBadge;
