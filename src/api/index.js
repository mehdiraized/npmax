import axios from "axios";

export const getPackagesInfo = (data) => {
  return axios.post("https://api.npms.io/v2/package/mget", data);
};
