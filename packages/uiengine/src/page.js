const path = require('path')
const R = require('ramda')
const glob = require('globby')
const frontmatter = require('./util/frontmatter')
const markdown = require('./util/markdown')
const PageUtil = require('./util/page')
const { debug2, debug3, debug4 } = require('./util/debug')

const assocPage = (pages, page) =>
  R.assoc(page.id, page, pages)

const createSchemaPage = state => (
  {
    id: PageUtil.SCHEMA_ID,
    path: PageUtil.SCHEMA_PAGE_PATH,
    type: 'schema',
    title: 'Schema',
    childIds: [],
    files: []
  }
)

async function readPageFile (state, filePath) {
  debug4(state, `Page.readPageFile(${filePath}):start`)

  const { source } = state.config
  let { attributes, body } = await frontmatter.fromFile(filePath, source)
  const content = await markdown.fromString(body)
  // prevent empty attributes from being null
  attributes = attributes || {}

  debug4(state, `Page.readPageFile(${filePath}):end`)

  return { attributes, content }
}

async function findPageFiles (pagesPath, pagePath, childIds = []) {
  const filesPattern = path.join(pagesPath, pagePath, '{,*/}*.*')
  const pageExcludes = ['**/_{,*/}*.*', `**/${PageUtil.PAGE_FILENAME}`]
  const childExcludes = R.map(id => path.join(id, '**'), childIds)
  const excludes = R.concat(pageExcludes, childExcludes)
  const excludePatterns = R.map((exclude) => '!' + path.join(pagesPath, exclude), excludes)
  const filePaths = await glob([filesPattern, ...excludePatterns])

  return filePaths
}

async function findPageIds (state, pagePath = '**') {
  const { pages } = state.config.source
  if (!pages) return []

  const pattern = path.resolve(pages, pagePath, PageUtil.PAGE_FILENAME)
  const pagePaths = await glob(pattern)
  const pageIdFromPageFilePath = R.partial(PageUtil.pageFilePathToPageId, [pages])
  const pageIds = R.map(pageIdFromPageFilePath, pagePaths)

  return pageIds
}

async function fetchAll (state) {
  debug2(state, `Page.fetchAll():start`)

  const pageIds = await findPageIds(state)

  const pageFetch = R.partial(fetchById, [state])
  const pageFetches = R.map(pageFetch, pageIds)
  const pageList = await Promise.all(pageFetches)

  // eventually append schema page
  if (Object.keys(state.schema || {}).length) {
    pageList.push(createSchemaPage(state))
  }

  const pages = R.reduce(assocPage, {}, pageList)

  debug2(state, `Page.fetchAll():end`)

  return pages
}

async function fetchById (state, id) {
  debug3(state, `Page.fetchById(${id}):start`)

  const { pages } = state.config.source
  const pagePath = PageUtil.pageIdToPath(id)
  const absolutePath = PageUtil.pageIdToPageFilePath(pages, id)
  const childPattern = path.join(pagePath, '*')
  const fetchChildIds = findPageIds(state, childPattern)
  const fetchPageData = readPageFile(state, absolutePath)

  // fetch childPageIds before fetching files to exclude
  // the children directories when looking for files
  const [pageData, childIds] = await Promise.all([fetchPageData, fetchChildIds])
  const files = await findPageFiles(pages, pagePath, childIds)

  if (PageUtil.isIndexPage(id)) childIds.push(PageUtil.SCHEMA_ID)

  let { attributes, content } = pageData

  const title = PageUtil.determineTitle(id, attributes, content)
  const type = PageUtil.determineType(attributes)
  attributes = PageUtil.convertUserProvidedChildrenList(id, childIds, attributes)
  attributes = PageUtil.convertUserProvidedComponentsList(id, attributes)
  const baseData = { id, path: pagePath, type, title, childIds, content, files }
  const data = R.mergeAll([baseData, attributes])

  debug3(state, `Page.fetchById(${id}):end`)

  return data
}

module.exports = {
  fetchAll,
  fetchById
}
