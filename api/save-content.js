const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求', success: false });
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }
    
    const { text, image, filename = 'content' } = JSON.parse(body);

    if (!text && !image) {
      return res.status(400).json({ 
        error: '请提供文本或图片数据', 
        success: false 
      });
    }

    const results = {};

    // 上传文本
    if (text) {
      const textResult = await saveToGitHub(text, 'Wenan', 'txt', filename);
      results.text = textResult;
    }

    // 上传图片
    if (image) {
      const imageResult = await saveToGitHub(image, 'img', 'image', filename);
      results.image = imageResult;
    }

    res.status(200).json({
      success: true,
      message: '内容保存成功',
      results: results
    });

  } catch (error) {
    console.error('保存错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误: ' + error.message
    });
  }
};

async function saveToGitHub(content, folder, type, originalName) {
  const GITHUB_OWNER = '6677nnannad';
  const GITHUB_REPO = 'HHL';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  let fileName, fileContent, message;

  if (type === 'txt') {
    fileName = `${timestamp}-${randomStr}.txt`;
    fileContent = Buffer.from(content).toString('base64');
    message = `添加文本: ${originalName}`;
  } else {
    const matches = content.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: '无效的图片格式' };
    }
    const imageType = matches[1];
    fileName = `${timestamp}-${randomStr}.${imageType}`;
    fileContent = matches[2];
    message = `添加图片: ${originalName}`;
  }

  const githubPath = `${folder}/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HHL-Content-Saver'
      },
      body: JSON.stringify({
        message: message,
        content: fileContent,
        branch: 'main'
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${githubPath}`,
        filename: fileName,
        githubUrl: result.content.html_url
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'GitHub保存失败' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}
