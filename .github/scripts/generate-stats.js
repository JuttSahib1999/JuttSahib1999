const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'JuttSahib1999';
const GH_TOKEN = process.env.GH_TOKEN;

const headers = {
  'Authorization': `Bearer ${GH_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json'
};

// Ensure assets directory exists
const assetsDir = path.join(process.cwd(), 'assets', 'github');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function fetchUserData() {
  try {
    const response = await axios.get(`https://api.github.com/users/${GITHUB_USERNAME}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    return null;
  }
}

async function fetchRepositories() {
  try {
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&page=${page}&sort=updated`,
        { headers }
      );
      
      if (response.data.length === 0) {
        hasMore = false;
      } else {
        allRepos = allRepos.concat(response.data);
        page++;
      }
    }

    return allRepos;
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    return [];
  }
}

async function fetchLanguages() {
  try {
    const repos = await fetchRepositories();
    const languageStats = {};
    const totalRepos = repos.length;

    for (const repo of repos) {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
      }
    }

    // Sort by count and take top 10
    return Object.entries(languageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([lang, count]) => ({
        language: lang,
        repos: count,
        percentage: ((count / totalRepos) * 100).toFixed(1)
      }));
  } catch (error) {
    console.error('Error calculating languages:', error.message);
    return [];
  }
}

function generateStatsSVG(userData) {
  const width = 450;
  const height = 180;
  
  const stats = [
    { label: 'Public Repos', value: userData.public_repos },
    { label: 'Public Gists', value: userData.public_gists },
    { label: 'Followers', value: userData.followers },
    { label: 'Following', value: userData.following }
  ];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .stat-box { fill: #0d1117; stroke: #30363d; stroke-width: 1; }
      .stat-label { font-size: 12px; fill: #8b949e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
      .stat-value { font-size: 24px; font-weight: 600; fill: #58a6ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    </style>
  </defs>
  
  <rect class="stat-box" x="0" y="0" width="${width}" height="${height}" rx="6"/>
  <text x="15" y="25" class="stat-label" style="font-size: 16px; font-weight: 600; fill: #c9d1d9;">GitHub Stats</text>
`;

  const boxWidth = (width - 30) / 4;
  const boxHeight = 120;
  const startY = 45;

  stats.forEach((stat, index) => {
    const x = 15 + (index * (boxWidth + 5));
    const y = startY;

    svg += `
  <rect class="stat-box" x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="4"/>
  <text x="${x + 10}" y="${y + 40}" class="stat-label">${stat.label}</text>
  <text x="${x + 10}" y="${y + 70}" class="stat-value">${stat.value}</text>
`;
  });

  svg += '</svg>';
  return svg;
}

function generateLanguagesSVG(languages) {
  const width = 450;
  const height = 300;
  const barHeight = 25;
  const margin = 40;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .lang-box { fill: #0d1117; stroke: #30363d; stroke-width: 1; }
      .lang-label { font-size: 13px; fill: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-weight: 500; }
      .lang-percent { font-size: 12px; fill: #8b949e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
      .lang-bar { fill: #58a6ff; }
    </style>
  </defs>
  
  <rect class="lang-box" x="0" y="0" width="${width}" height="${height}" rx="6"/>
  <text x="15" y="25" style="font-size: 16px; font-weight: 600; fill: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">Most Used Languages</text>
`;

  languages.forEach((lang, index) => {
    const y = 45 + (index * barHeight);
    const barWidth = (width - 120) * (lang.percentage / 100);

    svg += `
  <text x="15" y="${y + 18}" class="lang-label">${lang.language}</text>
  <rect class="lang-bar" x="120" y="${y + 5}" width="${barWidth}" height="15" rx="3"/>
  <text x="${125 + barWidth}" y="${y + 18}" class="lang-percent">${lang.percentage}%</text>
`;
  });

  svg += '</svg>';
  return svg;
}

async function main() {
  console.log(`Generating stats for ${GITHUB_USERNAME}...`);

  // Fetch data
  const userData = await fetchUserData();
  const languages = await fetchLanguages();

  if (!userData) {
    console.error('Failed to fetch user data');
    process.exit(1);
  }

  // Generate SVGs
  const statsSvg = generateStatsSVG(userData);
  const languagesSvg = generateLanguagesSVG(languages);

  // Write files
  fs.writeFileSync(path.join(assetsDir, 'github-stats.svg'), statsSvg);
  fs.writeFileSync(path.join(assetsDir, 'languages.svg'), languagesSvg);

  console.log('✅ Stats generated successfully');
  console.log(`   - GitHub stats: assets/github/github-stats.svg`);
  console.log(`   - Languages: assets/github/languages.svg`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
