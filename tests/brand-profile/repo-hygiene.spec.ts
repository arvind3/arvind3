import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function getReadmeContent(): string {
  return fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
}

function getFeaturedRepoNamesFromReadme(): string[] {
  const readme = getReadmeContent();
  const matches = [...readme.matchAll(/https:\/\/gh-card\.dev\/repos\/arvind3\/([^.?/]+)\.svg/gi)];
  return matches.map((match) => match[1]);
}

function getFeaturedRepoListEntriesFromReadme(): Array<{ name: string; description: string }> {
  const readme = getReadmeContent();
  const entries = [...readme.matchAll(/\d+\.\s+\[([^\]]+)\]\(https:\/\/github\.com\/arvind3\/[^)]+\)\s+-\s+(.+)/g)];

  return entries.map((entry) => ({
    name: entry[1],
    description: entry[2].trim(),
  }));
}

test.describe('Repository hygiene checks', () => {
  test('featured projects section shows six repo cards', async () => {
    expect(getFeaturedRepoNamesFromReadme()).toHaveLength(6);
  });

  test('featured repositories are non-forks and mostly described', async ({ request }) => {
    const featuredRepoNames = getFeaturedRepoNamesFromReadme();
    const featuredRepoEntries = getFeaturedRepoListEntriesFromReadme();
    let describedRepos = 0;

    expect(featuredRepoNames).toHaveLength(6);
    expect(featuredRepoEntries).toHaveLength(6);

    for (const repoInfo of featuredRepoEntries) {
      if (repoInfo.description.length >= 12) {
        describedRepos += 1;
      }

      const response = await request.get(`https://api.github.com/repos/arvind3/${repoInfo.name}`);
      expect(response.ok(), `Repo lookup failed: ${repoInfo.name}`).toBeTruthy();
      const repo = await response.json();
      expect(repo.fork, `${repoInfo.name} is a fork`).toBe(false);
    }

    expect(describedRepos).toBeGreaterThanOrEqual(4);
  });

  test('candidate featured repositories are owner repos (non-forks)', async ({ request }) => {
    const response = await request.get('https://api.github.com/users/arvind3/repos?per_page=100&type=owner&sort=updated');
    expect(response.ok()).toBeTruthy();

    const repos = await response.json();
    const byName = new Map(repos.map((repo: any) => [repo.name.toLowerCase(), repo]));

    const featured = [
      'qa-intelligence-platform',
      'brand-analytics-automation',
      'robot-finetune-model',
      'retail_analytics',
      'RobotFrameworkBookWithIDE',
      'brand-analytics-dashboard',
    ];

    for (const repoName of featured) {
      const repo = byName.get(repoName.toLowerCase());
      if (!repo) {
        continue;
      }

      expect(repo.fork).toBe(false);
    }
  });
});
