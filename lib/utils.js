export function getEnvValue(name, env = process.env){
    const value = env?.[name]

    if (value === undefined || value === null) {
        throw new Error(`${name} is not defined`);
    }

    return value;
}