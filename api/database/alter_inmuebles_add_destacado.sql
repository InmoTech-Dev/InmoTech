ALTER TABLE Inmuebles
ADD destacado BIT NOT NULL
  CONSTRAINT DF_Inmuebles_destacado DEFAULT 0;
