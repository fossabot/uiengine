const path = require('path')

const templateFilePathToTemplateId = (templatesPath, templateFilePath) => {
  if (!templateFilePath.startsWith(templatesPath)) return null

  const relative = path.relative(templatesPath, templateFilePath)
  const dirname = path.dirname(relative)
  const extname = path.extname(relative)
  const name = path.basename(relative, extname)
  const id = path.join(dirname, name)

  return id
}

module.exports = {
  templateFilePathToTemplateId
}
