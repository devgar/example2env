# example2env

[![npm](https://img.shields.io/npm/v/example2env)](https://www.npmjs.com/package/example2env)

Generate a `.env` file by answering prompts, using an existing `.env.example` as the template.

It reads the template, asks you for each variable with a sensible default already filled in, and writes the result to `.env` in the current directory.

```
$ npx example2env
? DISPLAY: :0
? USER: ed
? DB_NAME: larabel
```

## Install

Run it without installing:

```sh
npx example2env
```

Or install it globally:

```sh
npm install -g example2env
```

## Usage

```sh
example2env [source]
```

With no argument it looks in the current directory. The source can be a local path, a URL, or a GitHub repository.

| Source | Reads |
| --- | --- |
| *(nothing)* | `.env.example` in the current directory |
| `./config` | `.env.example` inside `./config` |
| `./config/.env.sample` | that exact file |
| `gh:owner/repo` | `.env.example` from the repo's default branch |
| `github:owner/repo` | the same |
| `https://…/.env.example` | that URL |

When the source is a **directory** or a **repository**, `.env.example` is tried first and `.env` is used as a fallback.

The `gh:` shorthand asks the GitHub API for the default branch, so it works whether the repo uses `main` or `master`. It only reads public repositories, and unauthenticated API requests are rate limited to 60 per hour.

## Template format

Standard `.env` syntax. Comments and blank lines are ignored, and an `export` prefix is accepted.

```sh
# Comments are ignored
DISPLAY=              # asked for, with no default
USER=root             # asked for, defaulting to root
DB_PASS=              # trailing comments are stripped from the value
export PATH=/usr/bin  # the export prefix is accepted
```

### Defaults

The default offered for each variable is the first of:

1. an answer you already gave for that same name earlier in the run,
2. the value of that variable in your current environment,
3. the value written in the template.

So a template line of `USER=root` offers `root`, unless `$USER` is set in your shell, in which case that wins.

An empty answer is rejected, so a variable with no default has to be filled in.

### Parameters

A value can be composed from other variables with `${...}`:

```sh
DB_URL=${DB_PROTOCOL}://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}
```

For a line like that you are first asked whether to build the value from its parts. Say yes and each parameter is prompted for in turn, then the assembled result is offered as the default:

```
? Complete «DB_URL» using its defined params? Yes
? DB_URL DB_PROTOCOL: postgres
? DB_URL DB_USER: ed
? DB_URL DB_PASS: secret
? DB_URL DB_HOST: localhost
? DB_URL DB_NAME: larabel
? DB_URL: postgres://ed:secret@localhost/larabel
```

Every parameter has to be answered: an empty one is rejected and asked again.
If you would rather paste the whole value in yourself, answer **no** to the
first question and the raw template value is offered as the default.

A parameter that is also a variable in its own right reuses the answer you already gave.

## Output

`.env` is written in the current working directory, as `NAME=value` lines in template order.

**An existing `.env` is overwritten without asking.** Comments and blank lines from the template are not carried over.

## Limitations

- A bare name with no `=`, such as `DB_HOST` on its own, is ignored and never prompted for.
- There is no non-interactive mode: the tool cannot currently be driven from a script or CI job ([#28](https://github.com/devgar/example2env/issues/28)).
- Values are written literally, without quoting or escaping.

## License

MIT © Edgar Albalate
