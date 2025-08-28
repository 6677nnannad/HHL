// 图片和文本上传API
async function handler(req, res) {
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
    const { text, image, filename = 'content' } = req.body;

    // 检查是否有内容
    if (!text && !image) {
      return res.status(400).json({ 
        error: '没有接收到文本或图片数据', 
        success: false 
      });
    }

    let result = {};

    // 处理文本上传
    if (text) {
      const textResult = await uploadTextToGitHub(text, filename);
      if (!textResult.success) {
        return res.status(500).json({
          success: false,
          error: '文本上传失败: ' + textResult.error
        });
      }
      result.text = textResult;
    }

    // 处理图片上传
    if (image) {
      const imageResult = await uploadImageToGitHub(image, filename);
      if (!imageResult.success) {
        return res.status(500).json({
          success: false,
          error: '图片上传失败: ' + imageResult.error
        });
      }
      result.image = imageResult;
    }

    res.status(200).json({
      success: true,
      message: '内容上传成功',
      data: result
    });

  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误: ' + error.message
    });
  }
}

// 上传文本到GitHub
async function uploadTextToGitHub(content, originalName) {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.txt`;
    const githubPath = `Wenan/${fileName}`;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}`;

    // 将文本内容转换为base64
    const base64Content = Buffer.from(content).toString('base64');

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HHL-Text-Server'
      },
      body: JSON.stringify({
        message: `上传文本: ${originalName}`,
        content: base64Content,
        branch: 'main'
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        textUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${githubPath}`,
        fileName: fileName
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

// 上传图片到GitHub
async function uploadImageToGitHub(imageData, originalName) {
  try {
    const GITHUB_OWNER = '6677nnannad';
    const GITHUB_REPO = 'HHL';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // 检查base64图片格式并提取数据
    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return { 
        success: false, 
        error: '无效的图片格式' 
      };
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.${imageType}`;
    const githubPath = `img/${fileName}`;

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}`;

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HHL-Image-Server'
      },
      body: JSON.stringify({
        message: `上传图片: ${originalName}`,
        content: base64Data,
        branch: 'main'
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        imageUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${githubPath}`,
        fileName: fileName
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

// 确保正确的导出
export default handler;
