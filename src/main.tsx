import main from '@dojo/example-runner/main';
import configs from './examples/src/config';

import dojo from '@dojo/themes/dojo';
import '@dojo/themes/dojo/index.css';

const tests = (require as any).context('./', true, /\.spec\.ts(x)?$/);
main({ domNode: document.getElementById('app')!, configs, themes: [dojo], tests });
