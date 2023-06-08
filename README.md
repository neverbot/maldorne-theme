<p align="center">
  <img width="800" alt="screenshot" src="/screenshot.png">
</p>

# Maldorne Theme

Based on the [Chic Template](https://github.com/Siricee/hexo-theme-Chic) by [@Siricee](https://github.com/Siricee).

> Chic, French word means 'Elegant' in English.

<p align="center">
<img alt="Author" src="https://img.shields.io/badge/Author-neverbot-blue.svg"/>
<img alt="Author" src="https://img.shields.io/badge/Author-siricee-blue.svg"/>
<img alt="Hexo" src="https://img.shields.io/badge/hexo-3.0+-0e83cd.svg?style=flat-square"/>
<img alt="Build Status" src="https://img.shields.io/badge/device-responsive-orange.svg"/>
</p>

## Contents
- [Doc language](#doc-language)
- [Contents](#contents)
- [Introduction](#introduction)
- [Demo](#demo)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Configuration](#configuration)
  - [Add 'Tag', 'Category' Page](#add-tagcategory-page)
  - [MathJax (Render LaTeX Formula)](#mathjax-render-latex-formula)
- [Customize](#customize)
- [FAQ](#faq)
- [Gallary](#gallary)
- [LICENSE](#license)

## Introduction
An elegant, powerful, easy-to-read Hexo theme.

## Demo
- [Demo site (maldorne.org)](https://maldorne.org)
- [Demo site (siricee.github.io)](https://siricee.github.io/hexo-theme-Chic)

## Features
- Appropriate blank blocks, elegant but not simple.
- ~Light/Dark theme, just one click.~ Removed in Maldorne version.
- Abundant highlight mode.
- Elaborately selected fonts, best reading experience. \* *'Microsoft Jhenghei' especially recommended.*
- Auto fit Mobile and Screen responsively.
- Support MathJax, Support Formula written in LaTeX.

## Installation
```bash
cd your-blog/themes
git clone https://github.com/neverbot/maldorne-theme.git maldorne
```
- Modify theme setting in `_config.yml` to `maldorne`.
- You can change the theme language in `themes/maldorne/_config.yml` in the `i18n/language` setting. 

## Requirements
Needed packages in your hexo blog:

- `hexo-fontawesome`

## Configuration
<details>
<summary><mark>click here to spread</mark></summary>

```yaml
# Header
navname: House of Maldorne

# navigator items
nav:
  - blog: 
    name: nav.blog 
    url: /archives
  - games: 
    name: nav.games
    url: /games
  - play: 
    name: nav.play
    url: /play
  - about:
    name: nav.about
    url: /about

# favicons
icons: true

# Profile
avatar: /image/maldorne_old_logo.png

i18n:
  language: en

# main menu navigation
## link is the complete url
## icon is the fontawesome icon name
## prefix is the fontawesome style
## Unused keys can be commented out.
links:
  Blog: 
    link: /archives
    icon: book-open
    prefix: fas
  Twitter: 
    link: https://twitter.com/houseofmaldorne
    icon: twitter
    prefix: fab
  LinkedIn: 
    link: https://www.linkedin.com/company/11107294
    icon: linkedin
    prefix: fab
  Github: 
    link: https://github.com/maldorne/
    icon: github
    prefix: fab
#  Category:
#  Tags: 
#  Link:
#  Resume:
#  Publish:
#  Trophy:
#  Gallary:
#  RSS:
#  AliPay:
#  ZhiHu: 
#  FaceBook:
#  Skype:
#  CodeSandBox:
#  CodePen:
#  Sketch:
#  Gitlab:
#  Dribble:
#  Instagram:
#  Reddit:
#  YouTube:
#  QQ:
#  Weibo:
#  WeChat:

# how links show: you have 2 choice--text or icon.
links_text_enable: false
links_icon_enable: true

# Post page
## Post_meta
post_meta_enable: true

post_author_enable: true
post_date_enable: true
post_category_enable: true
## Post copyright
post_copyright_enable: true

post_copyright_author_enable: false
post_copyright_permalink_enable: true
post_copyright_license_enable: false
post_copyright_license_text: Copyright (c) 2022 House of Maldorne
post_copyright_slogan_enable: false

## toc
post_toc_enable: true
page_toc_enable: true

# Page
page_title_enable: true

# Date / Time format
## Hexo uses Moment.js to parse and display date
## You can customize the date format as defined in
## http://momentjs.com/docs/#/displaying/format/
date_format: MMMM D, YYYY
time_format: HH:mm:ss

# stylesheets loaded in the <head>
stylesheets:
  - /css/style.css

# scripts loaded in the end of the body
scripts:
  - /js/script.js
  - /js/tocbot.min.js
    # tscanlin/tocbot: Build a table of contents from headings in an HTML document.
    # https://github.com/tscanlin/tocbot

# plugin functions
## Mathjax: Math Formula Support
## https://www.mathjax.org
mathjax:
  enable: true
  import: demand # global or demand
  ## global: all pages will load mathjax,this will degrade performance and some grammers may be parsed wrong.
  ## demand: Recommend option,if your post need fomula, you can declare 'mathjax: true' in Front-matter

```
</details>
<br>

### Add 'Tag', 'Category' Page

There is no 'tag' or 'category' page in initialized site. If you need it, please follow the steps below.

1. execute command
```bash
hexo new page tag
hexo new page category
```
2. enter the dictionary
```bash
cd source/tag
```
3. add 'layout' key
```yaml
// source\tag\index.md
---
title: Tag
layout: tag
---
```
4. So do the category page.please set keyword 'layout' category.

### MathJax (Render LaTeX Formula)

Related config file（`maldorne/_config.yml`）:

```yaml
# plugin functions
## Mathjax: Math Formula Support
## https://www.mathjax.org
mathjax:
  enable: true
  import: global # global or demand
  ## global: all pages will load mathjax,this will degrade performance and some grammers may be parsed wrong.
  ## demand: if your post need fomula, you can declare 'mathjax: true' in Front-matter
```
`mathjax` has keywords below：
- `enable`: value`true` enable mathjax(default set `true`); value`false` disable.
- `import`:this key sets mathjax load method, option could be `global` or `demand`.
  - `global`：global import, all pages will load script.It's convenient, but **it may cause some MarkDown grammers parsed wrong**.for example, consecutive `$$` will be rendered as a formula；Besides,global import will waste performance in pages without any formula.
  - `demand`【Recommended】：import mathjax when you need.After you set this value, if you need use formula,just declare it in post Front-matter.Here is an example below.
    ```yaml
    ---
    title: MathJax Test
    date: 2019-07-05 21:27:59
    tags:
    mathjax: true # add this statement, MathJax will enable in this post.
    ---
    ```
LaTeX grammers will not be illustrated in this doc. In Chic theme, Single '$' rounded statement is regarded as inline formula like `$f(x)=ax+b$` ; Double '$' rounded statement is regarded as block formula like `$$f(x)=ax+b$$`. More information please read LaTeX doc and [Formula test page in Demo Site](https://siricee.github.io/hexo-theme-Chic/2019/07/05/MathJax_test/).

## Customize

- Highlight Style：Enter `maldorne-theme\source\css\style.styl` change stylesheet with key word `_highlight` in link in `_highlight` dictionary.

- Customize stylesheets in path below.(stylus）

   `maldorne-theme\source\css\custom.styl`

- Customize javascripts in dictionary below.

  `maldorne-theme\source\js`

  Then add declaration in `_config.yml` key word 'script'

## FAQ

1. I deployed my site on second-level url (such as username.github.io/Blog), why my css,avatar and other sources missed (404 error)?

    Answer: You need change some URLs in root config url keyword. For instance:
    ```yaml
    # (blog/_config.yml)

    # URL
    ## If your site is put in a subdirectory, set url as 'http://yoursite.com/child' and root as '/child/'
    url: https://siricee.github.io/hexo-theme-Chic/  # this is your deploy url.
    root: /hexo-theme-Chic/  # this is your root folder url.
    permalink: :year/:month/:day/:title/
    permalink_defaults:
    ```

2. How to set the dark theme as default theme for whole site automatically?
   
   Answer: You need to change some codes in `maldorne-theme\source\js\script.js`, function `document.ready` as below.
   ```javascript
   document.ready(
    function () {
        // ...Omit part of the code
        const isDark = currentTheme === 'dark';
        // change this line to
        // const isDark = currentTheme !== 'dark';
   ```
   Now, you have already set the dark theme as default successfully.

3. More questions will be added later...


## LICENSE
- Chic © [@Siricee](https://github.com/Siricee)
- Maldorne © [@neverbot](https://github.com/neverbot)

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.
