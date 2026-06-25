/** Shape of the GitHub repo stats the demo exposes to the UI and caches. */
export type RepoStats = {
    fullName: string;
    description: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    language: string | null;
};
