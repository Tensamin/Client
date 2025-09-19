export function Loading({ message }: { message?: string }) {
  let splitMessage = message?.split("_") ?? [];
  let isError = splitMessage[0] === "ERROR";

  return (
    <div className="bg-red-500">
      {message || "Loading"}
      <br />
      {isError ? "Error" : null}
    </div>
  );
}
