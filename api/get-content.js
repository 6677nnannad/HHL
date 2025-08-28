const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // 设置CORS
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
    const [images, texts] = await Promise.all([
      getFolderContent('img'),
      getFolderContent('Wenan')
    ]);

    res.status(200).json({
      success: true,
      images: images,
      texts: texts,
      totalImages: images.length,
      totalTexts: texts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取内容错误:', error);
    res.status(500).json({
      success: false,
      error: '获取内容失败: ' + error.message
    });
  }
};

async function getFolderContent(folder) {
  const GITHUB_OWNER = '6677nnannad';
  const GITHUB_REPO = 'HHL';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${folder}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'HHL-Content-Getter'
      }
    });

    if (!response.ok) {
      return [];
    }

    const files = await response.json();
    
    if (!Array.isArray(files)) {
      return [];
    }

    const contents = await Promise.all(
      files.map(async (file) => {
        try {
          let content = '';
          if (folder === 'Wenan' && file.name.endsWith('.txt')) {
            const contentResponse = await fetch(file.download_url);
            content = await contentResponse.text();
          }

          return {
            name: file.name,
            type: folder === 'img' ? 'image' : 'text',
            url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${folder}/${file.name}`,
            size: file.size,
            uploadTime: file.name.split('.')[0],
            content: content,
            githubUrl: file.html_url,
            downloadUrl: file.download_url
          };
        } catch (error) {
          console.error(`处理文件 ${file.name} 错误:`, error);
          return null;
        }
      })
    );

    return contents.filter(item => item !== null)
                  .sort((a, b) => b.uploadTime - a.uploadTime);

  } catch (error) {
    console.error(`获取 ${folder} 文件夹内容错误:`, error);
    return [];
  }
}
