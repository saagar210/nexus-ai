import AnalyticsDashboard, {
  generateSampleStats,
} from "../components/AnalyticsDashboard";

export default function AnalyticsPage(): React.ReactElement {
  // In a real implementation, this would fetch from the API
  const stats = generateSampleStats();

  return (
    <div className="h-full p-6 overflow-auto">
      <AnalyticsDashboard
        stats={stats}
        onDateRangeChange={(range) => {
          console.log("Date range changed:", range);
          // Would trigger API refetch with new date range
        }}
      />
    </div>
  );
}
