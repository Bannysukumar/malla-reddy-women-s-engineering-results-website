import ClassResults from "../components/ClassResults";
import PageHeader from "../components/PageHeader";

export default function ClassResultPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Class Result"
        description="View the results of your classmates and compare performance across your section."
      />
      <ClassResults />
    </div>
  );
}
