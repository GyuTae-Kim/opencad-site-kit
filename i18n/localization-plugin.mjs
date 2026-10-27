import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { currentLanguage, languages, languageUrl, translate } from './core.mjs';
export { localizeManifest } from '../pwa/manifest.mjs';

const escape = value => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const decode = value => value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

/**
 * 빌드한 index.html을 language 페이지로 옮긴다: 검색 정보 자리를 그 언어로 다시 쓰고, body의 글·alt·title·aria-label·placeholder를
 * 사전으로 옮기고(script·style 안은 그대로), 링크는 그 언어 주소로, 언어 고르기 줄(data-static-languages)을 넣는다.
 * 다른 언어 페이지는 <언어>/에 있으므로 <base href="../">로 앱 뿌리의 파일을 쓴다.
 * site.manifest.links가 'html'(기본)이면 index.html의 앱 정보 링크를 <언어>/manifest.webmanifest로 바꾸고 홈 화면 이름(iOS)도 옮긴다.
 */
export function localizeHtml(html, language, site) {
  html=html.replace(/<!-- localized-metadata:start -->[\s\S]*?<!-- localized-metadata:end -->/,`<!-- localized-metadata:start -->${site.renderMetadata(language)}<!-- localized-metadata:end -->`);
  const body=html.indexOf('<body');
  let raw=false;
  html=html.slice(0,body)+html.slice(body).replace(/<[^>]+>|[^<]+/g,token=>{
    if(token.startsWith('<')){
      if(/^<(?:script|style)\b/i.test(token))raw=true;
      if(/^<\/(?:script|style)>/i.test(token))raw=false;
      return raw?token:token.replace(/\b(alt|title|aria-label|placeholder|href)="([^"]*)"/g,(_,name,value)=>`${name}="${escape(name==='href'?languageUrl(decode(value),language):translate(decode(value),language))}"`);
    }
    if(raw)return token;
    const translated=translate(decode(token),language);
    return translated===decode(token)?token:(token.match(/^\s*/)?.[0]??'')+escape(translated)+(token.match(/\s*$/)?.[0]??'');
  });
  const navigation = `<nav data-static-languages aria-label="Language">${languages.map(item => `<a href="${languageUrl(site.metadata.url,item.code)}" lang="${item.code}" hreflang="${item.code}"${item.code===language?' aria-current="true"':''}>${item.label}</a>`).join(' · ')}</nav>`;
  if (html.includes('data-static-languages')) html=html.replace(/<nav data-static-languages[^>]*>[\s\S]*?<\/nav>/,navigation);
  else html=html.replace(/(<main\b[^>]*>)/,'$1'+navigation);
  html=html.replace(/<html lang="[^"]*"/,`<html lang="${language}"`);
  if(language!=='ko'){
    html=html.replace('<head>','<head>\n    <base href="../">');
    if(site.manifest?.links!=='metadata'){
      // 홈 화면에 추가하면 그 언어 페이지로 열리게 언어별 앱 정보를 가리키고, iOS 홈 화면 이름도 옮긴다
      html=html.replace('href="./manifest.webmanifest"',`href="./${language}/manifest.webmanifest"`);
      html=html.replace(/(<meta name="apple-mobile-web-app-title" content=")([^"]*)"/,(_,head,title)=>head+escape(translate(decode(title),language))+'"');
    }
  }
  return html;
}

/** Vite 플러그인: 개발 서버는 주소의 언어로 옮겨 주고, 빌드는 dist/<언어>/index.html을 쓴다(앱 정보 파일은 siteMetadata가 쓴다) */
export function siteLocalization(site){
 return {
  name:'opencad-localized-pages',enforce:'post',
  transformIndexHtml:{order:'post',handler(html,ctx){return localizeHtml(html,currentLanguage(new URL(ctx.originalUrl??ctx.path,'http://localhost').href),site);}},
  writeBundle(options){
    const root=options.dir??'dist';const html=readFileSync(join(root,'index.html'),'utf8');
    for(const{code}of languages.filter(item=>item.code!=='ko')){
      mkdirSync(join(root,code),{recursive:true});writeFileSync(join(root,code,'index.html'),localizeHtml(html,code,site));
    }
  },
 };
}
