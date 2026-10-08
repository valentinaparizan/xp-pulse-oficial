import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseCotahist } from '../src/utils/cotahist.ts';
const [file,asOf,url]=process.argv.slice(2);
if(!file||!asOf||!url)throw Error('Uso: node --experimental-strip-types scripts/import-b3.ts arquivo.TXT AAAA-MM-DD URL-oficial');
const origin=new URL(url);if(origin.protocol!=='https:'||!['bvmf.bmfbovespa.com.br','arquivos.b3.com.br','www.b3.com.br'].includes(origin.hostname))throw Error('Use a URL oficial da origem do arquivo');
const bytes=fs.readFileSync(file), stocks=JSON.parse(fs.readFileSync('src/data/stocks.json','utf8'));
const parsed=parseCotahist(bytes.toString('latin1'),stocks.map((s:{ticker:string})=>s.ticker),asOf,url);
const metadata={...parsed.metadata,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),layoutUrl:'https://b3.com.br/data/files/C8/F3/08/B4/297BE410F816C9E492D828A8/SeriesHistoricas_Layout.pdf'};
// Validate entire input before replacing any data; this command generates reviewable snapshot artifacts.
fs.writeFileSync('src/data/options.json',JSON.stringify(parsed.options,null,2)+'\n');
fs.writeFileSync('src/data/stocks.json',JSON.stringify(stocks.map((s:{ticker:string})=>({...s,...parsed.stocks.find(p=>p.ticker===s.ticker)})),null,2)+'\n');
fs.writeFileSync('src/data/b3-metadata.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata));
