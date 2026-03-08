import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

function getFeaturedRepoNamesFromReadme(): string[] {
  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  const matches = [...readme.matchAll(/https:\/\/gh-card\.dev\/repos\/arvind3\/([^.?/]+)\.svg/gi)];
  return matches.map((match) => match[1]);
}

test.describe('GitHub profile integrity', () => {
  test('profile page loads and shows correct username', async ({ request }) => {
    const response = await request.get(expected.profileUrl);
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toMatch(/<title>[^<]*(arvind3|Arvind)[^<]*<\/title>/i);
    expect(html).toMatch(/Arvind Bhardwaj/i);
  });

  test('positioning is not generic and includes AI + QA + Analytics keywords', async ({ request }) => {
    const profileResponse = await request.get(expected.profileUrl);
    expect(profileResponse.ok()).toBeTruthy();

    const profileHtml = await profileResponse.text();
    const readmeText = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    const bioMatch = profileHtml.match(/\"bio\":\"([^\"]+)\"|Building AI/i);
    const bio = bioMatch?.[1] || bioMatch?.[0] || '';
    const combinedPositioningText = `${bio} ${readmeText}`;

    expect(combinedPositioningText).toMatch(/AI|QA|Analytics|Engineering/i);
    expect(/^[\s\S]*\bBuilding AI\b[\s\S]*$/i.test(readmeText)).toBe(false);
  });

  test('profile has 6 featured repos and none are forks', async ({ request }) => {
    const names = getFeaturedRepoNamesFromReadme();
    expect(names.length).toBe(6);

    for (const repoName of names) {
      const response = await request.get(`https://api.github.com/repos/arvind3/${repoName}`);
      expect(response.ok(), `Failed repo lookup for ${repoName}`).toBeTruthy();

      const repo = await response.json();
      expect(repo.fork, `${repoName} is unexpectedly a fork`).toBe(false);
    }
  });

  test('no repo called test is visible in featured projects', async () => {
    const names = getFeaturedRepoNamesFromReadme();
    expect(names.map((name) => name.toLowerCase())).not.toContain('test');
  });
});
