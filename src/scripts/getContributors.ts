import { Octokit } from "@octokit/core";
const path = require("path");
const fs = require("fs").promises;

const REPOS = [
  "defillama-app",
  "defillama-server",
  "dimension-adapters",
  "yield-server",
  "bridges-server",
  "peggedassets-server",
  "emissions-adapters",
  "DefiLlama-Adapters",
];

const octokit = new Octokit({
  auth: "token", // Replace with your personal access token when running locally
});

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processInChunks(
  contributors: string[],
  chunkSize: number,
  callback: any
) {
  let results: any[] = [];

  for (let i = 0; i < contributors.length; i += chunkSize) {
    await wait(500);
    const chunk = contributors.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(callback));
    results = results.concat(chunkResults as any);
  }

  return results;
}

async function getAllContributors(owner: string, repo: string): Promise<any[]> {
  let contributors: any[] = [];
  let page = 1;
  let fetchMore = true;

  while (fetchMore) {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contributors",
      {
        owner,
        repo,
        per_page: 100,
        page: page,
      }
    );
    if (response.data.length > 0) {
      contributors = contributors.concat(response.data as any);
      page++;
    } else {
      fetchMore = false;
    }
  }

  return contributors;
}

async function getContributorsWithUniqueMonthsOfCommits(
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    console.log(`Fetching contributors for ${owner}/${repo}...`);
    const contributorsResponse = await getAllContributors(owner, repo);
    const contributors = contributorsResponse;
    async function fetchContributorCommits(contributor: any) {
      return octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner,
        repo,
        author: contributor.login,
        per_page: 100,
      });
    }

    console.log(`Fetched contributors for ${owner}/${repo}...`);
    console.log(`Fetching commits for ${owner}/${repo}...`);
    const commitsResponses = await processInChunks(
      contributors,
      10,
      fetchContributorCommits
    );

    console.log(`Fetched commits for ${owner}/${repo}...`);

    const uniqueContributors: Record<string, string[]> = {};

    commitsResponses.forEach((response, index) => {
      const commits = response.data;
      const months = new Set<string>();
      commits.forEach((commit: any) => {
        const commitDate = new Date(commit.commit.author.date);
        const monthYear = `${
          commitDate.getMonth() + 1
        }-${commitDate.getFullYear()}`;
        months.add(monthYear);
      });

      if (months.size >= 2 && commits.length >= 5) {
        uniqueContributors[contributors[index].login as any] =
          Array.from(months);
      }
    });
    console.log(
      `Unique contributors for ${owner}/${repo}:`,
      Object.keys(uniqueContributors).length
    );
    return Object.keys(uniqueContributors);
  } catch (error) {
    console.error("Error fetching contributors:", error);
    return [];
  }
}

async function saveContributorsToFile(
  contributors: string[],
  filePath: string
) {
  try {
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, JSON.stringify(contributors, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving contributors to file:", error);
  }
}

const run = async () => {
  const contributorsData: string[] = [];

  for (const repo of REPOS) {
    const contributors = await getContributorsWithUniqueMonthsOfCommits(
      "DefiLlama",
      repo
    );
    contributorsData.push(...contributors);
  }

  const uniqueContributors = [...new Set<string>(contributorsData.flat())];

  await saveContributorsToFile(
    uniqueContributors,
    "src/data/uniqueContributors.json"
  );
};

run();
