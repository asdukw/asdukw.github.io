import { supabase } from "@/lib/supabase";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Lang, TocItem } from "@/lib/posts";
export interface EditablePost { id:number|null; publishedOn:string; isPublished:boolean; lang:Lang; title:string; excerpt:string; tags:string[]; sourceMdx:string; }
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]??c);
export function generateExcerpt(source:string,maxLength=180):string{const text=source.replace(/```[\s\S]*?```/g," ").replace(/!\[[^\]]*\]\([^)]*\)/g," ").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/[#>*_`~-]/g," ").replace(/\s+/g," ").trim();return text.length>maxLength?`${text.slice(0,maxLength-1).trimEnd()}…`:text;}
export function renderMdx(source:string){
 const toc:TocItem[]=[]; const used=new Set<string>();
 const slug=(value:string)=>{const base=value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")||`heading-${toc.length+1}`;let id=base;let n=2;while(used.has(id))id=`${base}-${n++}`;used.add(id);return id;};
 const raw=marked.parse(source,{gfm:true,breaks:true});
 const withIds=String(raw).replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g,(_,level,inner)=>{const text=String(inner).replace(/<[^>]+>/g,"");const id=slug(text);toc.push({id,text,level:Number(level)});return `<h${level} id="${esc(id)}">${inner}</h${level}>`;});
 return{html:DOMPurify.sanitize(withIds),toc};
}
export async function loadEditablePost(id:number,lang:Lang):Promise<EditablePost|null>{const{data,error}=await supabase.from("posts").select("id,published_on,is_published,posts_i18n!inner(lang,title,excerpt,tags,source_mdx)").eq("id",id).eq("posts_i18n.lang",lang).maybeSingle();if(error)throw error;if(!data)return null;const t=Array.isArray(data.posts_i18n)?data.posts_i18n[0]:data.posts_i18n;if(!t)return null;return{id:Number(data.id),publishedOn:data.published_on??new Date().toISOString().slice(0,10),isPublished:data.is_published,lang,title:t.title,excerpt:t.excerpt,tags:t.tags??[],sourceMdx:t.source_mdx};}
export async function saveEditablePost(post:EditablePost):Promise<number>{const r=renderMdx(post.sourceMdx);const{data,error}=await supabase.rpc("save_post_translation_by_id",{p_post_id:post.id,p_published_on:post.publishedOn,p_is_published:post.isPublished,p_lang:post.lang,p_title:post.title,p_excerpt:post.excerpt,p_tags:post.tags,p_source_mdx:post.sourceMdx,p_body_html:r.html,p_toc:r.toc});if(error)throw error;const id=Number(data);if(!Number.isSafeInteger(id))throw new Error("save_post_translation_by_id returned an invalid post id");return id;}
