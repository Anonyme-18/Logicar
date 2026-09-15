import { getDashboardAction } from "./dashboard.actions";

export const getDashboard = ({ data }: { data: { from: string; to: string } }) =>
  getDashboardAction(data);
