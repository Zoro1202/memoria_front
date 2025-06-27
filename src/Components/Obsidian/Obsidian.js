import { MarkExtension } from 'remirror';
import { InputRule } from 'prosemirror-inputrules';
import { Plugin } from 'prosemirror-state';
import { toast } from 'react';

export class ObsidianLinkExtension extends MarkExtension {
  static disableExtraAttributes = true;

  get name() {
    return 'obsidianLink';
  }

  createAttributes() {
    return {
      href: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-href') || '',
        toDOM: (value) => ({ 'data-href': value }),
      },
    };
  }

  createMarkSpec() {
    return {
      inclusive: false,
      attrs: {
        href: { default: '' },
      },
      toDOM: (mark) => [
        'span',
        {
          class: 'obsidian-link',
          'data-href': mark.attrs.href,
        },
        mark.attrs.href,
      ],
    };
  }

  createInputRules() {
    return [
      new InputRule(/\[\[([^[\]]+)\]\](?=$|\s)/, (state, match, start, end) => {
        const linkText = match[1];
        const { tr, schema } = state;
        const markType = schema.marks.obsidianLink;
        if (!markType || !linkText) return null;

        tr.delete(start, end);
        tr.insertText(linkText, start);
        tr.addMark(start, start + linkText.length, markType.create({ href: linkText }));
        return tr;
      }),
    ];
  }
}