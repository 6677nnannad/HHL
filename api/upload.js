
export default async function handler(req, res) {
  // 设置CORS头部
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
    const { image, filename = 'image' } = req.body;

    if (!image) {
      return res.status(400).json({ error: '没有接收到图片数据', success: false });
    }

    // 检查base64图片格式
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无效的图片格式', success: false });
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const finalFilename = `${timestamp}-${randomStr}.${imageType}`;
    
    // 指定GitHub路径
    const githubPath = `img/${finalFilename}`;

    // 上传到GitHub
    const uploadResult = await uploadToGitHub(githubPath, base64Data, filename);

    if (uploadResult.success) {
      res.status(200).json({
        success: true,
        message: '图片上传成功',
        imageUrl: uploadResult.imageUrl,
        filename: finalFilename
      });
    } else {
      res.status(500).json({
        success: false,
        error: uploadResult.error
      });
    }

  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误: ' + error.message
    });
  }
}

async function uploadToGitHub(path, content, originalName) {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HHL-Image-Server'
      },
      body: JSON.stringify({
        message: `上传图片: ${originalName}`,
        content: content,
        branch: 'main'
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        imageUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${path}`
      };
    } else {
      return { 
        success: false, 
        error: result.message || 'GitHub API错误' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}
