let baseURL: string;

if (process.env.URL) {
    baseURL = process.env.URL;
} else {
    baseURL = "https://cako.io";
}

export default baseURL;