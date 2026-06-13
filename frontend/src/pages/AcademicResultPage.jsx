import IndividualResults from "../components/IndividualResults";
import PageHeader from "../components/PageHeader";

export default function AcademicResultPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Academic Result"
        description="Access your overall academic performance with just a hall ticket."
      />
      <IndividualResults />
    </div>
  );
}
