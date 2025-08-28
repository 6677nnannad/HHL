export default async function handler(req, res) {
  // 设置CORS头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许GET请求', success: false });
  }

  try {
    const images = await getImagesFromGitHub();
    
    res.status(200).json({
      success: true,
      images: images,
      count: images.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取图片错误:', error);
    res.status(500).json({
      success: false,
      error: '获取图片失败: ' + error.message
    });
  }
}

async function getImagesFromGitHub() {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_PATH = 'img';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'HHL-Image-Server'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API错误: ${response.status}`);
    }

    const files = await response.json();

    // 过滤出图片文件
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const images = Array.isArray(files) ? files
      .filter(file => file.type === 'file' && 
        imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
      .map(file => ({
        name: file.name,
        url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_PATH}/${file.name}`,
        size: file.size,
        uploadTime: file.name.split('.')[0],
        githubUrl: file.html_url
      }))
      .sort((a, b) => b.uploadTime - a.uploadTime) : [];

    return images;

  } catch (error) {
    console.error('GitHub获取失败:', error);
    return [];
  }
}
