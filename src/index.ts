import fetch from "node-fetch";
import { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

type listRepoContentParameters =
  Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]["parameters"];

type ContentItem = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
};

const octokit = new Octokit({});
const stats: Map<string, number> = new Map();
const repo = {
  owner: "lodash",
  repo: "lodash",
  path: "",
};

const countLetterFrequency = (text: string) => {
  for (const char of text) {
    if (/[a-z]/i.test(char)) {
      const minChar = char.toLowerCase();
      stats.set(minChar, (stats.get(minChar) || 0) + 1);
    }
  }
};

const sortLetterFrequency = (freq: Map<string, number>) => {
  return new Map([...freq.entries()].sort((a, b) => b[1] - a[1]));
};

const getFileContent = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    console.log(error);
    return "";
  }
};

const getRepoPathContent = async (
  options: listRepoContentParameters
): Promise<ContentItem[]> => {
  try {
    const { data } = (await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      options
    )) as { data: ContentItem[] };

    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getRepoStats = async (options: listRepoContentParameters) => {
  try {
    const data = await getRepoPathContent(options);

    const filePromises = data
      .filter((item) => item.type === "file")
      .filter((item) => item.name.endsWith(".js") || item.name.endsWith(".ts"))
      .map(async (item) => {
        const text = await getFileContent(item.download_url);
        countLetterFrequency(text);
      });

    await Promise.allSettled(filePromises);

    const dirPromises = data
      .filter((item) => item.type === "dir")
      .map(async (item) => {
        try {
          await getRepoStats({
            ...options,
            path: item.path,
          });
        } catch (error) {
          console.log(error);
        }
      });

    await Promise.all(dirPromises);
  } catch (error) {
    console.log(error);
  }
};

const printSortedStats = async () => {
  console.log(new Date().toLocaleString(), "Fetching repo stats...");
  await getRepoStats(repo);
  const sortedStats = sortLetterFrequency(stats);
  console.log(`${new Date().toLocaleString()} Letter frequency:`, sortedStats);
};

printSortedStats();
