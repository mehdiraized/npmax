import axios from "axios";

export const getPackageInfo = (packageName) => {
	return axios
		.get("https://registry.npmjs.org/" + packageName + "/latest")
		.then((res) => res.data);
};
