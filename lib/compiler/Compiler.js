import Lexer from "./Lexer.js";
import AstGenerator from "./AstGenerator.js";
import Renderer from "./Renderer.js";

export default class Compiler {
  lexer = new Lexer();
  generator = new AstGenerator();
  renderer = new Renderer();

  process(input) {
    let tokens = this.lexer.tokenize(input);
    let ast = this.generator.generateAst(tokens);
    let underscoreTemplate = this.renderer.renderAst(ast);

    return underscoreTemplate;
  }
}