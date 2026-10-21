export default class Lexer {

  tokenLine = 0;
  tokenChar = 0;
  workingText = ''

  INLINE_WS=/[ \t]/;
  NEWLINE_WS=/[\r\n]/;
  SHORTHAND_CHARS = /[A-Za-z-_.# ]/

  tokenize(input) {
    if (typeof input != "string") {
      throw "ERROR: non-string input (Parser.tokenize)"
    }

    let currentPos = 0;
    let tokens = [];


    while (currentPos < input.length) {
      let char = input[currentPos];

      // newline handling
      if (this.NEWLINE_WS.test(char)) {
        this.pushToken(tokens, {type: 'newline', value: '\n', pos: [this.tokenLine, this.tokenChar]});

        currentPos += 1;
        this.tokenLine += 1;
        this.tokenChar = 0;
        continue;
      }

      /*
       * Possible opening template tag
       */
      if (char === '<') {
        if (currentPos + 1 < input.length) {
          let nextPos = currentPos + 1;
          let nextChar = input[nextPos];

          // Check for frostlining dialogue start: '<<<'
          if (nextChar === '<' && this.nextCharMatches('<', nextPos, input)) {
            this.pushToken(tokens, {type: 'fl-dialogue-start', value: '<<<', pos: [this.tokenLine, this.tokenChar]});
            currentPos += 3;
            this.tokenChar += 3;
            continue;
          }
          // Check for frostlining var-substitution opening tag: '<|[var_name]'
          else if (nextChar === '|') {
            this.pushToken(tokens, {type: 'fl-variable', value: '<|', pos: [this.tokenLine, this.tokenChar]});
            currentPos += 2;
            this.tokenChar += 2;

            // Variable names should have no whitespace between themselves and the tag.
            let newPos = this.pushConnectedSourceUntil(/[<>\s|[\]-]/, input, currentPos, tokens, "word", ".")
            this.tokenChar += newPos - currentPos;
            currentPos = newPos;
            continue;
          }
          // Check for frostlining conditional statement: '<? [JS_expr] ? [text] (| [text] ?>)'
          else if (nextChar === '?') {
            let conditionalEndPos = this.pushSourceUntil(/\?/, input, currentPos + 2, tokens, 'fl-conditional-start')
            if (conditionalEndPos !== currentPos) {
              this.tokenChar += conditionalEndPos + 1 - currentPos;
              currentPos = conditionalEndPos + 1;
              continue;
            }
          }
          // Check for HTML shorthand markup: '<:[fl-styling-names]: [text] (:>)'
          else if (nextChar === ':') {
            let shorthandEndPos = this.pushSourceUntil(/:/, input, currentPos + 2, tokens, 'fl-html-start', true);
            if (shorthandEndPos !== currentPos) {
              this.tokenChar += shorthandEndPos + 1 - currentPos;
              currentPos = shorthandEndPos + 1;

              // The closing tag can be omitted when styling a single word. This can be done by making
              // sure no whitespace exists between the opening tag and the word.
              // Whitespace should always be present after the opening tag if a closing tag is desired.
              let newPos = this.pushConnectedSourceUntil(/[<>|[\]\s]/, input, currentPos, tokens);
              this.tokenChar += newPos - currentPos;
              currentPos = newPos;
              continue;
            }
          }
          // Check for frostlining footnotes: '<& [text] | [text] &>
          else if (nextChar === '&') {
            this.pushToken(tokens, {type: 'fl-footnote-start', value: '<&', pos: [this.tokenLine, this.tokenChar]});
            currentPos += 2;
            this.tokenChar += 2;
            continue;
          }
          // Check for frostlining glue: '<>'
          else if (nextChar === '>') {
            this.pushToken(tokens, {type: 'fl-glue', value: '<>', pos: [this.tokenLine, this.tokenChar]});
            currentPos += 2;
            this.tokenChar += 2;
            continue;
          }

          let value = "";
          // Check for explicit whitespace: '<[ \t]+>'
          while (nextPos < input.length && this.INLINE_WS.test(nextChar)) {
            value += nextChar;
            nextPos += 1;
            nextChar = input[nextPos];
          }

          if (input[nextPos] === '>') {
            this.pushToken(
                tokens,
                {
                  type: 'fl-whitespace',
                  value: `<${value}>`,
                  pos: [this.tokenLine, this.tokenChar]
                });

            currentPos = nextPos + 1;
            continue;
          }
        }
      }

      // == Underscore tags
      // Opening tags
      if (char === '<' && this.nextCharMatches('%', currentPos, input)) {
        // interpolate tag
        if (this.nextCharMatches('=', currentPos + 1, input)) {
          this.pushToken(tokens, {type: "underscore-interp-start", value: "<%=", pos: [this.tokenLine, this.tokenChar]});
          currentPos += 3;
          this.tokenChar += 3;
          continue;
        }
        else if (this.nextCharMatches('-', currentPos + 1, input)) {
          this.pushToken(tokens, {type: "underscore-interp-esc-start", value: "<%-", pos: [this.tokenLine, this.tokenChar]});
          currentPos += 3;
          this.tokenChar += 3;
          continue;
        }
        // basic '<%' opening tag
        else {
          this.pushToken(tokens, {type: "underscore-start", value: "<%", pos: [this.tokenLine, this.tokenChar]});
          currentPos += 2;
          this.tokenChar += 2;
          continue;
        }
      }
      // closing '%>' tag
      if (char === '%' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'underscore-end', value: '%>', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }

      // == Twine links
      if (char === '[') {
        if (this.nextCharMatches('[', currentPos, input)) {
          this.pushToken(tokens, {type: 'tw-link-start', value: '[[', pos: [this.tokenLine, this.tokenChar]});
          currentPos += 2;
          this.tokenChar += 2;
          continue;
        } else {
          this.pushToken(tokens, {type: 'sq-bracket-open', value: '[', pos: [this.tokenLine, this.tokenChar]})
          currentPos += 1;
          this.tokenChar += 1;
          continue;
        }
      }
      else if (char === ']') {
        if (this.nextCharMatches(']', currentPos, input)) {
          this.pushToken(tokens, {type: 'tw-link-end', value: ']]', pos: [this.tokenLine, this.tokenChar]});
          currentPos += 2;
          this.tokenChar += 2;
          continue;
        } else {
          this.pushToken(tokens, {type: 'sq-bracket-closed', value: ']', pos: [this.tokenLine, this.tokenChar]})
          currentPos += 1;
          this.tokenChar += 1;
          continue;
        }
      }
      else if (char === '-' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'arrow', value: '->', pos: [this.tokenLine, this.tokenChar]});
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }
      else if (char === '<' && this.nextCharMatches('-', currentPos, input)) {
        this.pushToken(tokens, {type: 'rev-arrow', value: '<-', pos: [this.tokenLine, this.tokenChar]});
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }

      // Note any pipe chars ('|') that look syntactically important to Frostlining templating. These
      // are all pipe chars that are adjacent to one or more pipe chars.
      if (char === '|') {
        if (this.nextCharMatches('|', currentPos, input)) {
          currentPos = this.pushConnectedSourceUntil(/[^|]/, input, currentPos, tokens, 'source')
          continue;
        }

        this.pushToken(tokens, {type: 'pipe', value: '|', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 1;
        this.tokenChar += 1;
        continue;
      }

      // Note any double semicolons -- used to separate lines in dialogue sections
      if (char === ';' && this.nextCharMatches(';', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-dialogue-break', value: ';;', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }

      /*
       * Possible closing template tags
       */
      // Check for frostlining conditional:  '?>'
      if (char === '?' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-conditional-end', value: '?>', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }
      // Check for frostlining html-shorthand:  ':>'
      else if (char === ':' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-html-end', value: ':>', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }
      // check for frostlining footnotes: '&>'
      else if (char === '&' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-footnote-end', value: '&>', pos: [this.tokenLine, this.tokenChar]});
        currentPos += 2;
        this.tokenChar += 2;
        continue;
      }
      // Check for frostlining dialogue end: '>>>'
      if (char === '>' &&
          this.nextCharMatches('>', currentPos, input) &&
          this.nextCharMatches('>', currentPos + 1, input)) {
        this.pushToken(tokens, {type: 'fl-dialogue-end', value: '>>>', pos: [this.tokenLine, this.tokenChar]})
        currentPos += 3;
        this.tokenChar += 3;
        continue;
      }

      // No matches found -- just append this to workingText
      this.workingText += char;
      currentPos += 1;
      this.tokenChar += 1;
    }

    // Flush working text before returning the tokens.
    if (this.workingText.length > 0) {
      let text = this.workingText.trim();
      if (text.length > 0) {
        tokens.push({type: 'source', value: text, pos: [this.tokenLine, this.tokenChar]})
      }
      this.workingText = ''
    }

    return tokens;
  }

  pushConnectedSourceUntil(regex, input, currentPos, tokens, tokenType = 'word', trailingExclude = "") {
    if (/\s/.test(input[[currentPos]])) {
      return currentPos;
    }
    return this.pushSourceUntil(regex, input, currentPos, tokens, tokenType, false, trailingExclude);
  }

  pushSourceUntil(regex, input, currentPos, tokens, tokenType = 'source', pushOnZeroLength = false, trailingExclude = "") {
    let nextPos = currentPos;
    let value = ''

    let sourceStarted = false;
    while (nextPos < input.length) {
      if (sourceStarted) {
        if (!regex.test(input[nextPos])) {
          value += input[nextPos];
          nextPos += 1;
        } else {
          break;
        }
      } else {
        if (this.INLINE_WS.test(input[nextPos])) {
          nextPos += 1;
          continue;
        }
            // If a newline is found before the source starts, skip the
        // processing entirely.
        else if (this.NEWLINE_WS.test(input[nextPos])) {
          return currentPos;
        }

        sourceStarted = true;
      }
    }

    if (value.length > 0 || pushOnZeroLength) {
      if (trailingExclude.length > 0 && value.endsWith(trailingExclude)) {
        let splitPoint = value.length - trailingExclude.length;

        this.pushToken(
            tokens,
            {
              type: tokenType,
              value: value.substring(0, splitPoint).trim(),
              pos: [this.tokenLine, this.tokenChar]
            });
        this.pushToken(
            tokens,
            {
              type: 'source',
              value: value.substring(splitPoint).trim(),
              pos: [this.tokenLine, this.tokenChar + splitPoint]
            });

        return nextPos;
      }
      this.pushToken(
          tokens,
          {
            type: tokenType,
            value: value.trim(),
            pos: [this.tokenLine, this.tokenChar]
          });

      return nextPos;
    } else {
      return currentPos;
    }
  }


  pushToken(tokens, token) {
    // flush any working tokens.
    let text = this.workingText.trim();
    if (text.length > 0) {
      tokens.push({type: 'source', value: text, pos: [this.tokenLine, this.tokenChar]})
    }
    this.workingText = ''
    tokens.push(token);
  }

  nextCharMatches(char, position, input) {
    return position + 1 < input.length && input[position+1] === char
  }
}
