type RefetchResult = { error: unknown };

export async function refetchQueries(
  refetches: Array<() => Promise<RefetchResult>>,
): Promise<void> {
  const results = await Promise.all(refetches.map((refetch) => refetch()));
  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) {
    throw failedResult.error;
  }
}
