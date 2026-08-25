import BrainViewer from "@/components/brain/BrainViewer";

export default function LunaBrain() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">
          Luna Brain
        </h1>

        <p className="text-sm text-muted-foreground">
          Virtual neuroanatomical environment
        </p>
      </div>

      <div className="min-h-0 flex-1 p-4">
        <BrainViewer />
      </div>
    </div>
  );
}