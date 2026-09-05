export interface DiscussionConfig {
  owner: string;
  repo: string;
  categorySlug: string;
}

export interface DiscussionAuthor {
  id: string;
  login: string;
  avatarUrl: string;
  name: string | null;
  htmlUrl: string;
}

export interface DiscussionComment {
  id: number;
  nodeId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  parentId: number | null;
  author: DiscussionAuthor | null;
  reactions: {
    thumbsUp: number;
    viewerHasReacted: boolean;
  };
}

export interface DiscussionRef {
  number: number;
  title: string;
  url: string;
  nodeId: string;
}

export interface Discussion extends DiscussionRef {
  comments: DiscussionComment[];
}

export class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

interface RestDiscussion {
  number: number;
  title: string;
  html_url: string;
}

interface RestUser {
  id: number;
  login: string;
  avatar_url: string;
  name?: string | null;
  html_url: string;
}

interface RestComment {
  id: number;
  node_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  parent_id?: number | null;
  user: RestUser | null;
  reactions?: {
    "+1"?: number;
  };
}

interface GraphqlReactionGroup {
  content: string;
  viewerHasReacted: boolean;
  users: { totalCount: number };
}

interface GraphqlAuthor {
  id: string;
  login: string;
  avatarUrl: string;
  name?: string | null;
  url: string;
}

interface GraphqlComment {
  id: string;
  databaseId: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  author: GraphqlAuthor | null;
  reactionGroups: GraphqlReactionGroup[];
}

interface GraphqlDiscussion {
  id: string;
  number: number;
  title: string;
  url: string;
  comments: { nodes: GraphqlComment[] };
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";
const DISCUSSION_TITLE_PREFIX = "Comments: ";
const THUMBS_UP = "THUMBS_UP";

function repoPath(config: DiscussionConfig): string {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

function discussionTitle(category: string, slug: string): string {
  return `${DISCUSSION_TITLE_PREFIX}${category}/${slug}`;
}

function responseMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "GitHub API request failed";
}

async function githubJson<T>(
  path: string,
  token: string | undefined,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "asdukw-discussions");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${GITHUB_API}${path}`, { ...init, headers });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new GitHubApiError(response.status, responseMessage(data));
  }

  return data as T;
}

async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "asdukw-discussions",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as GraphqlResponse<T>;

  if (!response.ok || payload.errors?.length) {
    throw new GitHubApiError(
      response.status || 400,
      payload.errors?.map((error) => error.message).join("; ") || "GitHub GraphQL request failed",
    );
  }

  if (!payload.data) {
    throw new GitHubApiError(502, "GitHub GraphQL response was empty");
  }
  return payload.data;
}

function mapRestAuthor(user: RestUser | null): DiscussionAuthor | null {
  if (!user) return null;
  return {
    id: String(user.id),
    login: user.login,
    avatarUrl: user.avatar_url,
    name: user.name ?? null,
    htmlUrl: user.html_url,
  };
}

function mapRestComment(comment: RestComment): DiscussionComment {
  return {
    id: comment.id,
    nodeId: comment.node_id,
    body: comment.body,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    url: comment.html_url,
    parentId: comment.parent_id ?? null,
    author: mapRestAuthor(comment.user),
    reactions: {
      thumbsUp: comment.reactions?.["+1"] ?? 0,
      viewerHasReacted: false,
    },
  };
}

function mapGraphqlComment(comment: GraphqlComment): DiscussionComment {
  const thumbsUp = comment.reactionGroups.find((group) => group.content === THUMBS_UP);
  return {
    id: comment.databaseId ?? 0,
    nodeId: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    url: comment.url,
    parentId: null,
    author: comment.author
      ? {
          id: comment.author.id,
          login: comment.author.login,
          avatarUrl: comment.author.avatarUrl,
          name: comment.author.name ?? null,
          htmlUrl: comment.author.url,
        }
      : null,
    reactions: {
      thumbsUp: thumbsUp?.users.totalCount ?? 0,
      viewerHasReacted: thumbsUp?.viewerHasReacted ?? false,
    },
  };
}

const GRAPHQL_COMMENT_FIELDS = `
  id
  databaseId
  body
  createdAt
  updatedAt
  url
  author {
    ... on User {
      id
      login
      avatarUrl
      name
      url
    }
  }
  reactionGroups {
    content
    viewerHasReacted
    users { totalCount }
  }
`;

async function findDiscussion(
  config: DiscussionConfig,
  category: string,
  slug: string,
  token?: string,
): Promise<DiscussionRef | null> {
  const discussions = await githubJson<RestDiscussion[]>(
    `${repoPath(config)}/discussions?per_page=100&direction=desc&sort=created`,
    token,
  );
  const title = discussionTitle(category, slug);
  const found = discussions.find((discussion) => discussion.title === title);
  if (!found) return null;
  return {
    number: found.number,
    title: found.title,
    url: found.html_url,
    nodeId: "",
  };
}

async function fetchRestDiscussion(
  config: DiscussionConfig,
  ref: DiscussionRef,
  token?: string,
): Promise<Discussion> {
  const comments = await githubJson<RestComment[]>(
    `${repoPath(config)}/discussions/${ref.number}/comments?per_page=100`,
    token,
  );
  return { ...ref, comments: comments.map(mapRestComment) };
}

async function fetchGraphqlDiscussion(
  config: DiscussionConfig,
  number: number,
  token: string,
): Promise<Discussion | null> {
  const query = `
    query SiteDiscussion($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          id
          number
          title
          url
          comments(first: 100) {
            nodes {
              ${GRAPHQL_COMMENT_FIELDS}
            }
          }
        }
      }
    }
  `;
  const result = await githubGraphql<{
    repository: { discussion: GraphqlDiscussion | null };
  }>(query, { owner: config.owner, name: config.repo, number }, token);
  const discussion = result.repository.discussion;
  if (!discussion) return null;
  return {
    number: discussion.number,
    title: discussion.title,
    url: discussion.url,
    nodeId: discussion.id,
    comments: discussion.comments.nodes.map(mapGraphqlComment),
  };
}

export async function getDiscussion(
  config: DiscussionConfig,
  category: string,
  slug: string,
  token?: string,
): Promise<Discussion | null> {
  const ref = await findDiscussion(config, category, slug, token);
  if (!ref) return null;

  if (token) {
    try {
      const discussion = await fetchGraphqlDiscussion(config, ref.number, token);
      if (discussion) return discussion;
    } catch {
      // A pre-existing OAuth session may not have the new discussion scope yet.
      // Public REST data is still useful while the user re-authorizes the app.
    }
  }

  return fetchRestDiscussion(config, ref, token);
}

async function createDiscussion(
  config: DiscussionConfig,
  category: string,
  slug: string,
  token: string,
): Promise<DiscussionRef> {
  const metadataQuery = `
    query DiscussionMetadata($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 50) {
          nodes { id slug }
        }
      }
    }
  `;
  const metadata = await githubGraphql<{
    repository: {
      id: string;
      discussionCategories: { nodes: Array<{ id: string; slug: string }> };
    };
  }>(metadataQuery, { owner: config.owner, name: config.repo }, token);
  const categoryNode = metadata.repository.discussionCategories.nodes.find(
    (item) => item.slug === config.categorySlug,
  );
  if (!categoryNode) {
    throw new GitHubApiError(500, `Discussion category not found: ${config.categorySlug}`);
  }

  const mutation = `
    mutation CreateSiteDiscussion($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repositoryId
        categoryId: $categoryId
        title: $title
        body: $body
      }) {
        discussion { id number title url }
      }
    }
  `;
  const result = await githubGraphql<{
    createDiscussion: { discussion: { id: string; number: number; title: string; url: string } };
  }>(
    mutation,
    {
      repositoryId: metadata.repository.id,
      categoryId: categoryNode.id,
      title: discussionTitle(category, slug),
      body: `Comments for the article ${category}/${slug}.`,
    },
    token,
  );
  const discussion = result.createDiscussion.discussion;
  return {
    number: discussion.number,
    title: discussion.title,
    url: discussion.url,
    nodeId: discussion.id,
  };
}

export async function addDiscussionComment(
  config: DiscussionConfig,
  category: string,
  slug: string,
  body: string,
  token: string,
): Promise<{ discussion: DiscussionRef; comment: DiscussionComment }> {
  const existing = await findDiscussion(config, category, slug, token);
  let discussionRef: DiscussionRef;
  if (existing) {
    const discussion = await fetchGraphqlDiscussion(config, existing.number, token);
    if (!discussion) throw new GitHubApiError(404, "Discussion not found");
    discussionRef = discussion;
  } else {
    discussionRef = await createDiscussion(config, category, slug, token);
  }

  const mutation = `
    mutation AddSiteDiscussionComment($discussionId: ID!, $body: String!) {
      addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
        comment {
          ${GRAPHQL_COMMENT_FIELDS}
        }
      }
    }
  `;
  const result = await githubGraphql<{
    addDiscussionComment: { comment: GraphqlComment };
  }>(mutation, { discussionId: discussionRef.nodeId, body }, token);

  return {
    discussion: discussionRef,
    comment: mapGraphqlComment(result.addDiscussionComment.comment),
  };
}

export async function setDiscussionCommentLike(
  config: DiscussionConfig,
  category: string,
  slug: string,
  commentId: number,
  liked: boolean,
  token: string,
): Promise<{ commentId: number; liked: boolean; thumbsUp: number }> {
  const discussion = await getDiscussionForMutation(config, category, slug, token);
  const comment = discussion.comments.find((item) => item.id === commentId);
  if (!comment || !comment.nodeId) {
    throw new GitHubApiError(404, "Discussion comment not found");
  }

  const mutation = liked
    ? `
        mutation AddCommentLike($subjectId: ID!) {
          addReaction(input: { subjectId: $subjectId, content: THUMBS_UP }) {
            reaction { content }
          }
        }
      `
    : `
        mutation RemoveCommentLike($subjectId: ID!) {
          removeReaction(input: { subjectId: $subjectId, content: THUMBS_UP }) {
            reaction { content }
          }
        }
      `;
  await githubGraphql(mutation, { subjectId: comment.nodeId }, token);

  const updated = await fetchGraphqlDiscussion(config, discussion.number, token);
  const updatedComment = updated?.comments.find((item) => item.id === commentId);
  if (!updatedComment) throw new GitHubApiError(404, "Discussion comment not found");
  return {
    commentId,
    liked: updatedComment.reactions.viewerHasReacted,
    thumbsUp: updatedComment.reactions.thumbsUp,
  };
}

async function getDiscussionForMutation(
  config: DiscussionConfig,
  category: string,
  slug: string,
  token: string,
): Promise<Discussion> {
  const ref = await findDiscussion(config, category, slug, token);
  if (!ref) throw new GitHubApiError(404, "Discussion not found");
  const discussion = await fetchGraphqlDiscussion(config, ref.number, token);
  if (!discussion) throw new GitHubApiError(404, "Discussion not found");
  return discussion;
}
