const puppeteer = require('puppeteer')
const fs = require('fs')
/**
 * 获取导航栏
 * @param {String} navName 
 * @param {Page} page
 * @returns {Array} navTypes 导航名称
 * @returns {String} contentCls 导航内容 DOM class
 */
const fetchNav = async (navName, page) => {
  return await page.$$eval('#content h4', ($navs, navName) => {
    const $title = [...$navs].find(e => e.innerHTML.includes(navName))
    const $navItems = [...$title.nextElementSibling.querySelectorAll('li.nav-item')]
    const $content = $title.nextElementSibling.nextElementSibling
    const contentCls = [...$content.classList].find(cls => cls.includes('ajax'));
    const navTypes = []
    // 遍历所有的类别
    $navItems.forEach(async $li => {
      // 获取类别名称
      let navType = $li.querySelector('a').innerHTML
      let navId = $li.querySelector('a').id
      navTypes.push({ navId, navType })
    })
    return { navTypes, contentCls }
  }, navName)
}
/**
 * 获取所有导航内容
 * @param {Array} navTypes 导航名称
 * @param {String} contentCls 导航内容 DOM class
 * @param {Page} page
 * @returns {Array} navList 
 */
const fetchSites = async (navTypes, contentCls, page) => {
  const navList = []
  for (let i = 0; i < navTypes.length; i++) {
    const { navId, navType } = navTypes[i];
    // 点击该导航
    await page.click(`#${navId}`)
    // 获取该导航的所有网站
    const siteList = await page.$eval(`.${contentCls}`, $content => {
      let siteList = [];
      let $urlCards = [...$content.querySelectorAll('.url-card')]
      $urlCards.forEach($urlCard => {
        let $card = $urlCard.querySelector('a.card')
        let { url: href, originalTitle: desc } = $card.dataset
        let logo = $card.querySelector('.url-img img').src
        let name = $card.querySelector('.url-info strong').innerText
        siteList.push({ name, href, logo, desc })
      })
      return siteList
    })
    navList.push({ navType, siteList })
  }
  return navList
}

/**
 * crawler
 * @author Likai Lee
 * @date 2020-05-02
 * @param {String} params.url url
 * @param {Array} params.names 导航名称
 * @param {Array} params.config puppeteer config
 */
const crawler = async ({ url, names, config }) => {
  try {
    (async () => {
      const browser = await puppeteer.launch(config)
      const page = await browser.newPage()
      page.setViewport({
        width: 1920,
        height: 1080
      });
      await page.goto(url)
      for (let i = 0; i < names.length; i++) {
        const { navTypes, contentCls } = await fetchNav(names[i], page)
        const navList = await fetchSites(navTypes, contentCls, page)
        await fs.writeFile(`${names[i]}.json`, JSON.stringify(navList, null, '\t'), (err, data) => {
          if (err) {
            throw err
          }
        })
      }
    })();
  } catch (e) {
    console.error(e)
  }
}

module.exports = crawler