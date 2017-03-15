
type transformerFn = (el: any, val?: any) => any;

export class Transformer {
  public static create(name: string, transforms: transformerFn[]): transformerFn {
    return (el) => {
      let text = el.text().trim();
      let val = transforms.reduce((acc, cur) => cur(el, acc), text);
      return { name, val };
    };
  }
}

interface TransformerDictionary {
  [key: string]: transformerFn
}

export default class RowConverter {
  transformers: TransformerDictionary;

  constructor(transformers: TransformerDictionary) {
    this.transformers = transformers;
  }

  convert(row, $) {
    let self = this;
    return row.children().map(function(){
      let td = $(this);
      let stat = td.data('stat');
      let transformer = self.transformers[stat];
      if (!transformer) {
        return null;
      }
      return transformer(td);
    })
    .toArray()
    .filter(val => !!val)
    .reduce((memo, {name, val}) => {
      memo[name] = val;
      return memo;
    }, {});
  }
}