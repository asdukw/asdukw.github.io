import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, markdownShortcutPlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/i18n/LanguageContext";
import { loadEditablePost, saveEditablePost, type EditablePost } from "@/lib/postEditor";
import type { Category } from "@/lib/posts";

export function PostEditorPage({ category: initialCategory, create = false }: { category?: Category; create?: boolean }) {
  const { slug, category: routeCategory } = useParams();
  const category = (routeCategory === "blog" || routeCategory === "tech" ? routeCategory : initialCategory) as Category;
  const { user, loading: authLoading, login } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [post, setPost] = useState<EditablePost>({ category, slug: "", publishedOn: new Date().toISOString().slice(0, 10), isPublished: false, lang, title: "", excerpt: "", tags: [], sourceMdx: "# " });
  const [loading, setLoading] = useState(!create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (create || !slug || !user) return;
    void loadEditablePost(category, slug, lang).then((value) => { if (value) setPost(value); else setError("Post not found or you cannot edit it."); }).catch(() => setError("Unable to load post.")).finally(() => setLoading(false));
  }, [category, create, lang, slug, user]);

  if (authLoading) return <div className="container mx-auto px-4 py-12">Loading…</div>;
  if (!user) return <div className="container mx-auto px-4 py-12"><p className="mb-4">Sign in with GitHub to write posts.</p><Button onClick={login}>Sign in</Button></div>;
  if (!create && !slug) return <Navigate to={`/${category}`} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { await saveEditablePost(post); navigate(`/${post.category}/${post.slug}`); }
    catch { setError("Unable to save. Check the slug and your edit permission."); }
    finally { setSaving(false); }
  }

  return <div className="container mx-auto max-w-4xl px-4 py-10"><h1 className="mb-6 text-3xl font-bold">{create ? "New post" : "Edit post"}</h1>{loading ? <p>Loading…</p> : <form className="space-y-5" onSubmit={submit}>
    <label className="block">Title<input className="mt-1 w-full rounded-md border bg-background p-2" value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} required /></label>
    <label className="block">Slug<input className="mt-1 w-full rounded-md border bg-background p-2" value={post.slug} onChange={(e) => setPost({ ...post, slug: e.target.value })} disabled={!create} required pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,254}" /></label>
    <label className="block">Excerpt<textarea className="mt-1 w-full rounded-md border bg-background p-2" value={post.excerpt} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} /></label>
    <label className="block">Tags (comma separated)<input className="mt-1 w-full rounded-md border bg-background p-2" value={post.tags.join(", ")} onChange={(e) => setPost({ ...post, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={post.isPublished} onChange={(e) => setPost({ ...post, isPublished: e.target.checked })} />Published</label>
    <div className="rounded-md border bg-background p-3"><MDXEditor markdown={post.sourceMdx} onChange={(sourceMdx) => setPost((value) => ({ ...value, sourceMdx }))} plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), markdownShortcutPlugin()]} /></div>
    {error && <p className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save post"}</Button>
  </form>}</div>;
}
