import Parser from '../../lib/passage/Parser.js';
import Renderer from "../../lib/passage/Renderer.js";
import $ from 'jquery';
import {output} from "../../webpack.config.cjs";

// Mock window.story.state for _.template
global.window = {};

// Mock jQuery event trigger
$.event = { trigger: jest.fn() };

describe('Renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic input', () => {
    it('UnderscoreTemplate', () => {
      let input = [
          "<% console.log('Hello World') %>",
          "Hello,<%= getName() %>",
          "<%- 1+2 %>",
      ];

      const parser = new Parser();
      const renderer = new Renderer();
      input.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item));
        let output = renderer.astToPassageTemplate(ast);
        expect(output).toBe(item);
      });
    });

    it('TwineLink', () => {
      let inputAndResult = [
        {
          input: '[[label|destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">label</a>'
        },
        {
          input: '[[label->destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">label</a>'
        },
        {
          input: '[[destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">destination</a>'
        },
        {
          input: '[[destination<-label]]',
          output: '<a href="javascript:void(0)" data-passage="destination" is-embed=true>label</a>'
        },
        {
          input: '[[<|new_location]]',
          output: '<a href="javascript:void(0)" data-passage="<%= new_location %>"><%= new_location %></a>'
        },
        {
          input: '[[<|new_location|destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination"><%= new_location %></a>'
        }
      ];

      const parser = new Parser();
      const renderer = new Renderer();
      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
        expect(output).toBe(item.output);
      });
    });

    it('Source', () => {
      let input = [
        "<a href='https://example.com'>test-link<\\a>",
        "<h1 className='title' id='main-title'>H1 Heading</h1>",
        "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>\n<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>",
        "<h2>Deeply Nested Elements</h2>\n" +
          "<div class='level-1'>\n" +
          "<div class='level-2'>\n" +
          "<div class='level-3'>\n" +
          "<div class='level-4'>\n" +
          "<div class='level-5'>\n" +
          "<p class='deep-text'>This text is nested 5 levels deep</p>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "<p>Selector challenge: <code>.level-1 .level-3 .level-5 p</code></p>"
      ]

      const parser = new Parser();
      const renderer = new Renderer();
      input.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item));
        let output = renderer.astToPassageTemplate(ast);
        expect(output).toBe(item);
      });
    });

  })

});

