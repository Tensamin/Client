export function Loading({ message }: { message?: string }) {
  const splitMessage = message?.split("_") ?? [];
  const isError = splitMessage[0] === "ERROR";

  return (
    <div className="bg-red-500">
      {message || "Loading"}
      <br />
      {isError ? "Error" : null}
    </div>
  );
}
