export default class Renderer {

  // Traverses AST to produce a source string that can be used
  // with the Underscore's .template() function.
  astToPassageTemplate(ast) {

    if (ast.type !== 'Passage') {
      throw "Error: passageToTemplate() must take a 'Passage' node."
    }

    return ast.children.reduce((sourceString, astNode) => sourceString + walk(astNode), "");
  }


}

function walk(astNode) {
  switch (astNode.type) {
    case 'UnderscoreTemplate': {
      let templateValue = astNode.children.reduce(getChildrenSource, "");
      return `<% ${templateValue} %>`;
    }
    case 'UnderscoreInterpolate': {
      let templateValue = astNode.children.reduce(getChildrenSource, "");
      return `<%= ${templateValue} %>`;
    }
    case 'UnderscoreInterpolateEscaped': {
      let templateValue = astNode.children.reduce(getChildrenSource, "");
      return `<%- ${templateValue} %>`;
    }
    case 'TwineLink': {

      let passageSrc = astNode.passage.reduce(getChildrenSource, "");
      let labelSrc = astNode.label.reduce(getChildrenSource, "");
      let labelValue = labelSrc.length > 0 ? labelSrc : passageSrc;

      let linkTemplate;
      if (astNode.isEmbed) {
        linkTemplate = `<a href="javascript:void(0)" data-passage="${passageSrc}" is-embed=true>${labelValue}</a>`;
      } else {
        linkTemplate = `<a href="javascript:void(0)" data-passage="${passageSrc}">${labelValue}</a>`;
      }

      return linkTemplate;
    }
    case 'FrostliningInterpolate': return `<%= ${astNode.value} %>`;
    case `FrostliningConditional`: {
      let ifSource = astNode.children.reduce(getChildrenSource, "");
      let source = ` <% if (${astNode.conditional}) { %> ${ifSource} <% }`;

      let elseSource = astNode.children.reduce(getChildrenSource, "");
      if (elseSource.length > 0) {
        source += ` else { %> ${elseSource} <% } %>`;
      } else {
        source += " %>";
      }

      return source;
    }
    case `FrostliningHtmlShorthand` : {
      let idSource = (astNode.id.length > 0) ? `id="${astNode.id}"` : "";
      let classSource = (astNode.classes.length > 0) ? `classes="${astNode.classes.join(' ')}"`: "";
      let childrenSource = astNode.children.reduce(getChildrenSource, "");

      return `<${astNode.tag} ${idSource} ${classSource}> ${childrenSource} </${astNode.tag}>`
    }
    case `FrostliningFootnote` : {
      let labelSource = astNode.label.reduce(getChildrenSource, "");
      let childrenSource = astNode.children.reduce(getChildrenSource, "");
      let labelId= randomCssId();

      return (
          `<span id="${labelId}">${labelSource}</span>` +
          `<span id="${labelId}-footnote"> <em>(${childrenSource})</em></span>` +
          `<script>$("#${labelId}").on('click', toggleFootnote)</script>`
      );
    }
    case 'Source':
    case 'Newline':
      return astNode.value;
    default:
      throw `Unknown node type '${astNode.type}' encountered when rendering AST.`
  }
}

function getChildrenSource(sourceString, child) {
  return (sourceString.length > 0) ? `${sourceString} ${walk(child)}` : walk(child);
}

function randomCssId () {
  return Math.random().toString(36).replace(/^0\./, '_')
}
