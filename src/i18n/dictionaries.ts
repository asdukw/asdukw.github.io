export interface Dict {
  nav: Record<"home" | "blog" | "tech" | "projects" | "about", string>;
  common: {
    readMore: string;
    all: string;
    minRead: string;
    posts: string;
    backToTop: string;
  };
  home: {
    greeting: string;
    subtitle: string;
    recentJournal: string;
    recentTech: string;
    viewAll: string;
  };
  list: {
    total: string;
    empty: string;
    loading: string;
    loadError: string;
    retry: string;
  };
  post: {
    publishedOn: string;
    lastUpdated: string;
    translatedAs: string;
    previous: string;
    next: string;
    backToCategory: string;
  };
  comments: {
    title: string;
    count: string;
    loading: string;
    empty: string;
    unavailable: string;
    loadError: string;
    retry: string;
    signInToComment: string;
    signInToLike: string;
    placeholder: string;
    submit: string;
    submitting: string;
    like: string;
    liked: string;
    actionError: string;
  };
  footer: {
    rights: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
    switch: string;
  };
  about: {
    introTitle: string;
    intro1: string;
    intro2: string;
    contactTitle: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    admin: string;
  };
}

export const zh: Dict = {
  nav: {
    home: "首页",
    blog: "随笔",
    tech: "技术博客",
    projects: "项目",
    about: "关于",
  },
  common: {
    readMore: "阅读全文",
    all: "全部",
    minRead: "分钟阅读",
    posts: "篇文章",
    backToTop: "回到顶部",
  },
  home: {
    greeting: "你好，我是",
    subtitle: "在这里记录代码、阅读与生活的点滴。",
    recentJournal: "最新随笔",
    recentTech: "最新技术文章",
    viewAll: "查看全部",
  },
  list: {
    total: "共 {count,number,integer} 篇",
    empty: "这里还什么都没有。",
    loading: "正在加载文章…",
    loadError: "文章加载失败，请稍后再试。",
    retry: "重新加载",
  },
  post: {
    publishedOn: "发布于",
    lastUpdated: "最后更新",
    translatedAs: "本文还有另一个语言版本",
    previous: "上一篇",
    next: "下一篇",
    backToCategory: "返回列表",
  },
  comments: {
    title: "评论",
    count: "条评论",
    loading: "正在加载评论…",
    empty: "还没有评论，来说点什么吧。",
    unavailable: "评论服务暂时不可用，请稍后再试。",
    loadError: "评论加载失败，请稍后再试。",
    retry: "重新加载",
    signInToComment: "登录 GitHub 后发表评论。",
    signInToLike: "登录 GitHub 后点赞。",
    placeholder: "写下你的评论…",
    submit: "发表评论",
    submitting: "发布中…",
    like: "点赞",
    liked: "取消点赞",
    actionError: "操作失败，请稍后再试。",
  },
  footer: {
    rights: "保留所有权利。",
  },
  theme: {
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    switch: "切换主题",
  },
  about: {
    introTitle: "关于我",
    intro1: "你好，我是 asdukw，一名软件工程师。",
    intro2: "白天写代码，晚上写文字。这里记录我的技术与生活。",
    contactTitle: "联系方式",
  },
  auth: {
    signIn: "登录",
    signOut: "退出登录",
    admin: "管理员",
  },
};

export const en: Dict = {
  nav: {
    home: "Home",
    blog: "Journal",
    tech: "Tech",
    projects: "Projects",
    about: "About",
  },
  common: {
    readMore: "Read more",
    all: "All",
    minRead: "min read",
    posts: "posts",
    backToTop: "Back to top",
  },
  home: {
    greeting: "Hi, I'm",
    subtitle: "Writing down code, reading, and the small things in life.",
    recentJournal: "Recent journal",
    recentTech: "Recent tech posts",
    viewAll: "View all",
  },
  list: {
    total: "{count,number,integer} posts",
    empty: "Nothing here yet.",
    loading: "Loading posts…",
    loadError: "Posts could not be loaded. Please try again later.",
    retry: "Try again",
  },
  post: {
    publishedOn: "Published",
    lastUpdated: "Updated",
    translatedAs: "Also available in",
    previous: "Previous",
    next: "Next",
    backToCategory: "Back to list",
  },
  comments: {
    title: "Comments",
    count: "comments",
    loading: "Loading comments…",
    empty: "No comments yet. Start the conversation.",
    unavailable: "The comment service is temporarily unavailable. Please try again later.",
    loadError: "Comments could not be loaded. Please try again later.",
    retry: "Try again",
    signInToComment: "Sign in with GitHub to leave a comment.",
    signInToLike: "Sign in with GitHub to like a comment.",
    placeholder: "Write a comment…",
    submit: "Post comment",
    submitting: "Posting…",
    like: "Like",
    liked: "Unlike",
    actionError: "That action failed. Please try again.",
  },
  footer: {
    rights: "All rights reserved.",
  },
  theme: {
    light: "Light",
    dark: "Dark",
    system: "System",
    switch: "Toggle theme",
  },
  about: {
    introTitle: "About me",
    intro1: "Hi, I'm asdukw, a software engineer.",
    intro2: "I write code by day and words by night. This site holds my notes on tech and life.",
    contactTitle: "Contact",
  },
  auth: {
    signIn: "Sign in",
    signOut: "Sign out",
    admin: "Admin",
  },
};

export const dictionaries: Record<"zh" | "en", Dict> = { zh, en };
export type LangKey = keyof typeof dictionaries;
