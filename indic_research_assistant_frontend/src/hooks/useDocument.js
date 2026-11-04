

import { useState, useEffect } from "react";
import api from "../instances/axiosInstance";

const useDocument = ()=>{
      const [docs, setDocs] = useState([]);
      const [docLoading, setdocLoading] = useState(false);
      const [docsStatus, setDocsStatus] = useState("loading");

      const fetchDocs = async()=>{
        try{
            setdocLoading(true);
            const res = await api.get("/api/docs");

            if(res.status===200)
            {
                setDocs(res.data.docs || []);
                setDocsStatus("ready");
            }
        }
        catch(err){
            setDocsStatus("error");
        }
        finally{
            setdocLoading(false)
        }
       
      }

      useEffect(()=> {
        fetchDocs();
      }, [])

      return {docs, setDocs, docsStatus, setDocsStatus, fetchDocs, docLoading}

}

export default useDocument