install: install-deps install-flow-typed

run:
	npm run babel-node -- 'src/bin/page-loader.js'

test-run:
	npm run babel-node -- 'src/bin/page-loader.js' https://ya.ru
install-deps:
	npm install

install-flow-typed:
	npm run flow-typed install

build:
	rm -rf dist
	npm run build

test:
	npm test

watch:
	npm run test -- --watch

check-types:
	npm run flow

lint:
	npm run eslint .

publish:
	npm publish

.PHONY: test
